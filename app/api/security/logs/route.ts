import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/security/logs — Güvenlik loglarını listele (patron only)
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200)
  const offset = Number(url.searchParams.get("offset")) || 0
  const eventType = url.searchParams.get("event_type") || ""

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("security_logs")
      .select("id, user_id, event_type, ip_address, user_agent, details, success, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (eventType) {
      query = query.eq("event_type", eventType)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
