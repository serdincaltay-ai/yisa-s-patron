import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST: seçilen paketlere göre aylık/yıllık fiyat döndürür.
 * Body: { itemTypes: string[] } (örn. ["web", "logo", "tesis"])
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const itemTypes = Array.isArray(body.itemTypes) ? body.itemTypes : []

    const supabase = createAdminClient()
    const { data: rows } = await supabase
      .from("package_pricing")
      .select("item_type, base_price, monthly_price")
      .in("item_type", itemTypes.length ? itemTypes : ["web", "logo", "tesis"])

    let totalBase = 0
    let totalMonthly = 0
    for (const r of rows || []) {
      totalBase += Number(r.base_price) || 0
      totalMonthly += Number(r.monthly_price) || 0
    }

    const monthly = totalMonthly || totalBase / 12
    const yearly = monthly * 12

    return NextResponse.json({
      success: true,
      items: rows || [],
      totalBase,
      monthly: Math.round(monthly * 100) / 100,
      yearly: Math.round(yearly * 100) / 100,
    })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
