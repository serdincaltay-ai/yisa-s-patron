import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError } from "@/lib/errors"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/store/cart?tenantId=xxx
 * Tenant'in aktif satin alimlarini listeler (sepet / abonelik durumu).
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ purchases: [], total_monthly: 0 })
    }

    const { data: purchases, error } = await supabase
      .from("store_purchases")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error("Satin alma kayitlari getirilemedi")
    }

    const totalMonthly = (purchases ?? []).reduce(
      (sum, p) => sum + (p.monthly_price ?? 0),
      0
    )

    return NextResponse.json({
      purchases: purchases ?? [],
      total_monthly: totalMonthly,
    })
  })
}
