import { createAdminClient } from "@/lib/supabase/admin"
import { logSecurityEvent, extractIP, extractUserAgent } from "./log"

interface IPAccessRule {
  id: string
  ip_address: string
  rule_type: "block" | "allow"
  reason: string | null
  expires_at: string | null
}

/**
 * IP adresinin erişim izni olup olmadığını kontrol eder.
 * Returns: { allowed: boolean, rule?: IPAccessRule }
 */
export async function checkIPAccess(
  request: Request
): Promise<{ allowed: boolean; rule?: IPAccessRule }> {
  const ip = extractIP(request)
  if (ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return { allowed: true }
  }

  try {
    const supabase = createAdminClient()

    // Aktif engelleme kurallarını kontrol et
    const { data: rules } = await supabase
      .from("ip_access_rules")
      .select("id, ip_address, rule_type, reason, expires_at")
      .eq("ip_address", ip)
      .order("created_at", { ascending: false })

    if (!rules || rules.length === 0) {
      return { allowed: true }
    }

    const now = new Date()
    for (const rule of rules) {
      // Süresi dolmuş kuralları atla
      if (rule.expires_at && new Date(rule.expires_at) < now) continue

      if (rule.rule_type === "block") {
        // IP engeli logla
        await logSecurityEvent({
          eventType: "ip_block",
          ipAddress: ip,
          userAgent: extractUserAgent(request),
          details: { ruleId: rule.id, reason: rule.reason },
          success: false,
        })
        return { allowed: false, rule: rule as IPAccessRule }
      }
    }

    return { allowed: true }
  } catch (e) {
    console.error("[IPAccess] Kontrol hatası:", e)
    // Hata durumunda erişime izin ver (fail-open)
    return { allowed: true }
  }
}

/**
 * IP adresi engeller (patron tarafından).
 */
export async function blockIP(
  ipAddress: string,
  reason: string,
  createdBy?: string,
  expiresAt?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("ip_access_rules").insert({
      ip_address: ipAddress,
      rule_type: "block",
      reason,
      created_by: createdBy ?? null,
      expires_at: expiresAt ?? null,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/**
 * IP engelini kaldırır.
 */
export async function unblockIP(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("ip_access_rules")
      .delete()
      .eq("id", ruleId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
