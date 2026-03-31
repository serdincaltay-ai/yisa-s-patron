import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { blockIP, unblockIP } from "@/lib/security/ip-access"

/**
 * GET /api/security/ip-rules — IP erişim kurallarını listele
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("ip_access_rules")
      .select("id, ip_address, rule_type, reason, expires_at, created_by, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rules: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/**
 * POST /api/security/ip-rules — Yeni IP kuralı ekle (engelle)
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const ipAddress = typeof body?.ip_address === "string" ? body.ip_address.trim() : ""
    const reason = typeof body?.reason === "string" ? body.reason.trim() : ""
    const expiresAt = typeof body?.expires_at === "string" ? body.expires_at : undefined

    if (!ipAddress) {
      return NextResponse.json({ error: "ip_address zorunlu" }, { status: 400 })
    }

    // Validate IP format before hitting PostgreSQL INET column
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
    const ipv6Regex = /^[0-9a-fA-F:]+(\/\d{1,3})?$/
    if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
      return NextResponse.json({ error: "Geçersiz IP adresi formatı" }, { status: 400 })
    }

    const result = await blockIP(ipAddress, reason || "Manuel engelleme", undefined, expiresAt)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `${ipAddress} engellendi` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/**
 * DELETE /api/security/ip-rules — IP engelini kaldır
 */
export async function DELETE(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const ruleId = typeof body?.rule_id === "string" ? body.rule_id : ""

    if (!ruleId) {
      return NextResponse.json({ error: "rule_id zorunlu" }, { status: 400 })
    }

    const result = await unblockIP(ruleId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Engel kaldırıldı" })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
