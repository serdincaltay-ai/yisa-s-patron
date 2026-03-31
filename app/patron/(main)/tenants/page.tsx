import { createAdminClient } from "@/lib/supabase/admin"
import { insertTenantWithFallback } from "@/lib/supabase/tenant-insert"
import Link from "next/link"
import TenantsList from "./TenantsList"

export const metadata = {
  title: "Franchise İzleme | YİSA-S Patron",
  description: "Tüm franchise (tenant) listesi",
}

/**
 * Ensure fenerbahceatasehir tenant exists in DB.
 * Runs once on page load — idempotent via slug uniqueness.
 */
async function ensureFenerTenant(supabase: ReturnType<typeof createAdminClient>) {
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "fenerbahceatasehir")
    .maybeSingle()
  if (!existing) {
    await insertTenantWithFallback(supabase, {
      tenantName: "Fenerbahçe Ataşehir",
      slug: "fenerbahceatasehir",
      status: "aktif",
      tokenBalance: 0,
      setupCompleted: false,
    })
  }
}

export default async function PatronTenantsPage() {
  const supabase = createAdminClient()

  // #19: Fener franchise yoksa oluştur
  await ensureFenerTenant(supabase)

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, ad, slug, durum, token_balance, setup_completed")
    .order("ad")
  const list = tenants ?? []
  const tenantIds = list.map((t) => t.id)

  // #20: athletes + payments + cash_register + user_tenants paralel sorgula
  const [athletesRes, userTenantsRes, cashRes, paymentsRes] = await Promise.allSettled([
    tenantIds.length
      ? supabase.from("athletes").select("tenant_id").in("tenant_id", tenantIds)
      : Promise.resolve({ data: [] }),
    tenantIds.length
      ? supabase.from("user_tenants").select("tenant_id").in("tenant_id", tenantIds)
      : Promise.resolve({ data: [] }),
    tenantIds.length
      ? supabase.from("cash_register").select("tenant_id, tur, tutar").in("tenant_id", tenantIds)
      : Promise.resolve({ data: [] }),
    tenantIds.length
      ? supabase.from("payments").select("tenant_id, amount, status").in("tenant_id", tenantIds)
      : Promise.resolve({ data: [] }),
  ])

  const athleteCount: Record<string, number> = {}
  const staffCount: Record<string, number> = {}
  const gelirByTenant: Record<string, number> = {}
  const athletesData = athletesRes.status === "fulfilled" ? (athletesRes.value.data ?? []) : []
  const userTenantsData = userTenantsRes.status === "fulfilled" ? (userTenantsRes.value.data ?? []) : []
  const cashData = cashRes.status === "fulfilled" ? (cashRes.value.data ?? []) : []
  const paymentsData = paymentsRes.status === "fulfilled" ? (paymentsRes.value.data ?? []) : []

  athletesData.forEach((r: { tenant_id: string }) => {
    athleteCount[r.tenant_id] = (athleteCount[r.tenant_id] ?? 0) + 1
  })
  userTenantsData.forEach((r: { tenant_id: string }) => {
    staffCount[r.tenant_id] = (staffCount[r.tenant_id] ?? 0) + 1
  })
  // cash_register gelir
  cashData.forEach((r: { tenant_id: string; tur: string; tutar: number }) => {
    if (r.tur === "gelir" || r.tur === "income" || !r.tur) {
      gelirByTenant[r.tenant_id] = (gelirByTenant[r.tenant_id] ?? 0) + (r.tutar ?? 0)
    }
  })
  // #23: payments tablosundan da gelir hesapla (ödeme kayıtları = gelir)
  paymentsData.forEach((r: { tenant_id: string; amount: number; status: string }) => {
    if (r.amount > 0 && (r.status === "paid" || r.status === "onaylandi")) {
      gelirByTenant[r.tenant_id] = (gelirByTenant[r.tenant_id] ?? 0) + (r.amount ?? 0)
    }
  })

  const summary = {
    toplam_tenant: list.length,
    aktif_tenant: list.filter((t) => (t.durum ?? "").toString().toLowerCase() === "aktif").length,
    toplam_sporcu: Object.values(athleteCount).reduce((a, b) => a + b, 0),
    toplam_gelir: Object.values(gelirByTenant).reduce((a, b) => a + b, 0),
  }

  const items = list.map((t) => ({
    id: t.id,
    ad: t.ad ?? "",
    slug: t.slug ?? "",
    durum: t.durum ?? "",
    token_balance: t.token_balance ?? 0,
    setup_completed: t.setup_completed ?? false,
    sporcu_sayisi: athleteCount[t.id] ?? 0,
    personel_sayisi: staffCount[t.id] ?? 0,
    toplam_gelir: gelirByTenant[t.id] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
        Franchise İzleme
      </h2>
      <TenantsList tenants={items} summary={summary} />
    </div>
  )
}
