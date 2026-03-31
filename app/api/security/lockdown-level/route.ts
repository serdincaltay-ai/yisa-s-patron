import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import {
  getLockdownPolicy,
  resolveLockdownLevel,
  setLockdownLevel,
  type LockdownLevel,
} from "@/lib/security/lockdown-level"

/**
 * GET /api/security/lockdown-level
 * 4 seviye kilitleme durumunu ve aktif policy'yi döner.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const level = await resolveLockdownLevel()
  const policy = getLockdownPolicy(level)
  return NextResponse.json({ level, policy })
}

/**
 * POST /api/security/lockdown-level
 * Body: { level: "green" | "yellow" | "orange" | "red" }
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const level = body?.level as LockdownLevel
  if (!["green", "yellow", "orange", "red"].includes(level)) {
    return NextResponse.json(
      { error: "Geçersiz level. green|yellow|orange|red olmalı" },
      { status: 400 }
    )
  }

  const updated = await setLockdownLevel(level)
  const policy = getLockdownPolicy(updated)
  return NextResponse.json({ success: true, level: updated, policy })
}
