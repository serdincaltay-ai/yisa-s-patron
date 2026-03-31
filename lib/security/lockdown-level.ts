import { createAdminClient } from "@/lib/supabase/admin"

export type LockdownLevel = "green" | "yellow" | "orange" | "red"

export type LockdownPolicy = {
  level: LockdownLevel
  maxFailedAttempts: number
  blockMinutes: number
  windowMinutes: number
}

const DEFAULT_LEVEL: LockdownLevel = "green"

const LOCKDOWN_POLICIES: Record<LockdownLevel, LockdownPolicy> = {
  green: { level: "green", maxFailedAttempts: 5, blockMinutes: 30, windowMinutes: 30 },
  yellow: { level: "yellow", maxFailedAttempts: 4, blockMinutes: 45, windowMinutes: 30 },
  orange: { level: "orange", maxFailedAttempts: 3, blockMinutes: 60, windowMinutes: 30 },
  red: { level: "red", maxFailedAttempts: 2, blockMinutes: 120, windowMinutes: 30 },
}

function normalizeLevel(value: unknown): LockdownLevel | null {
  if (typeof value !== "string") return null
  const v = value.trim().toLowerCase()
  if (v === "green" || v === "yellow" || v === "orange" || v === "red") return v
  if (v === "1") return "green"
  if (v === "2") return "yellow"
  if (v === "3") return "orange"
  if (v === "4") return "red"
  return null
}

function getAdminOrNull() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

/**
 * Aktif kilitleme seviyesini cozer.
 * Oncelik:
 * 1) SECURITY_LOCKDOWN_LEVEL / NEXT_PUBLIC_SECURITY_LOCKDOWN_LEVEL env
 * 2) company_info.key = security_lockdown_level
 * 3) default: green
 */
export async function resolveLockdownLevel(
  admin = getAdminOrNull()
): Promise<LockdownLevel> {
  const envLevel =
    normalizeLevel(process.env.SECURITY_LOCKDOWN_LEVEL) ??
    normalizeLevel(process.env.NEXT_PUBLIC_SECURITY_LOCKDOWN_LEVEL)
  if (envLevel) return envLevel

  if (!admin) return DEFAULT_LEVEL

  try {
    const { data } = await admin
      .from("company_info")
      .select("value")
      .eq("key", "security_lockdown_level")
      .limit(1)
      .maybeSingle()

    return normalizeLevel(data?.value) ?? DEFAULT_LEVEL
  } catch {
    return DEFAULT_LEVEL
  }
}

export function getLockdownPolicy(level: LockdownLevel): LockdownPolicy {
  return LOCKDOWN_POLICIES[level]
}

export async function getLockdownConfig(
  admin = getAdminOrNull()
): Promise<LockdownPolicy> {
  const level = await resolveLockdownLevel(admin)
  return getLockdownPolicy(level)
}

/**
 * Patron tarafindan kilitleme seviyesini kalici olarak ayarlar.
 */
export async function setLockdownLevel(
  level: LockdownLevel,
  admin = getAdminOrNull()
): Promise<LockdownLevel> {
  if (!admin) throw new Error("Admin client hazir degil")

  const { error } = await admin
    .from("company_info")
    .upsert(
      {
        key: "security_lockdown_level",
        value: level,
        category: "other",
        lang: "tr",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

  if (error) throw new Error(error.message)
  return level
}

