import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError } from "@/lib/errors"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/patron/tenants — Tüm tenantlar + sayımlar
 */
export async function GET() {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")
    const supabase = createAdminClient()

    const { data: tenants, error: tenantsErr } = await supabase
      .from("tenants")
      .select("id, ad, slug, durum, token_balance, setup_completed, owner_id")
      .order("ad")

    if (tenantsErr) throw new Error(tenantsErr.message)
    const list = tenants ?? []

    const tenantIds = list.map((t) => t.id)

    const [athletesRes, userTenantsRes, cashRes] = await Promise.all([
      tenantIds.length
        ? supabase.from("athletes").select("tenant_id").in("tenant_id", tenantIds)
        : Promise.resolve({ data: [] }),
      tenantIds.length
        ? supabase.from("user_tenants").select("tenant_id").in("tenant_id", tenantIds)
        : Promise.resolve({ data: [] }),
      tenantIds.length
        ? supabase.from("cash_register").select("tenant_id, tur, tutar").in("tenant_id", tenantIds)
        : Promise.resolve({ data: [] }),
    ])

    const athleteCount: Record<string, number> = {}
    const staffCount: Record<string, number> = {}
    const gelirByTenant: Record<string, number> = {}
    ;(athletesRes.data ?? []).forEach((r: { tenant_id: string }) => {
      athleteCount[r.tenant_id] = (athleteCount[r.tenant_id] ?? 0) + 1
    })
    ;(userTenantsRes.data ?? []).forEach((r: { tenant_id: string }) => {
      staffCount[r.tenant_id] = (staffCount[r.tenant_id] ?? 0) + 1
    })
    ;(cashRes.data ?? []).forEach((r: { tenant_id: string; tur: string; tutar: number }) => {
      if (r.tur === "gelir" || r.tur === "income" || !r.tur) {
        gelirByTenant[r.tenant_id] = (gelirByTenant[r.tenant_id] ?? 0) + (r.tutar ?? 0)
      }
    })

    const totalAthletes = Object.values(athleteCount).reduce((a, b) => a + b, 0)
    const totalGelir = Object.values(gelirByTenant).reduce((a, b) => a + b, 0)
    const aktifCount = list.filter((t) => (t.durum ?? "").toString().toLowerCase() === "aktif").length

    const items = list.map((t) => ({
      id: t.id,
      ad: t.ad ?? "",
      slug: t.slug ?? "",
      durum: t.durum ?? "",
      token_balance: t.token_balance ?? 0,
      setup_completed: t.setup_completed ?? false,
      owner_id: t.owner_id ?? null,
      sporcu_sayisi: athleteCount[t.id] ?? 0,
      personel_sayisi: staffCount[t.id] ?? 0,
      toplam_gelir: gelirByTenant[t.id] ?? 0,
    }))

    return NextResponse.json({
      tenants: items,
      summary: {
        toplam_tenant: list.length,
        aktif_tenant: aktifCount,
        toplam_sporcu: totalAthletes,
        toplam_gelir: totalGelir,
      },
    })
  })
}
