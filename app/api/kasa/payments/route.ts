import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/kasa/payments — Ödeme kayıtlarını getir (payments tablosu).
 * Kasa defteri gelir tarafında kullanılır (#23).
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get("tenant_id")
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10) || 100)

  const supabase = createAdminClient()
  let query = supabase
    .from("payments")
    .select("id, amount, status, created_at, tenant_id, description")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (tenantId) query = query.eq("tenant_id", tenantId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
