import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import TenantDetail from "./TenantDetail"

export const metadata = {
  title: "Tenant Detay | YİSA-S Patron",
  description: "Tenant detay sayfası",
}

export default async function PatronTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single()

  if (tenantErr || !tenant) notFound()

  const settings = (tenant.settings as Record<string, unknown>) ?? {}
  const sehir = (settings.sehir ?? tenant.sehir) as string | undefined
  const ilce = (settings.ilce ?? tenant.ilce) as string | undefined
  const telefon = (settings.telefon ?? settings.owner_phone ?? tenant.telefon) as string | undefined

  const [athletesRes, athletesCountRes, userTenantsRes, cashRes, attendanceRes] = await Promise.allSettled([
    supabase.from("athletes").select("id, name, surname, durum, ders_kredisi").eq("tenant_id", id).order("id", { ascending: false }).limit(5),
    supabase.from("athletes").select("id", { count: "exact", head: true }).eq("tenant_id", id),
    supabase.from("user_tenants").select("id, user_id, role").eq("tenant_id", id),
    supabase.from("cash_register").select("id, tarih, tur, tutar").eq("tenant_id", id),
    supabase.from("attendance").select("id", { count: "exact", head: true }).eq("tenant_id", id),
  ])

  const athletes = athletesRes.status === "fulfilled" ? (athletesRes.value.data ?? []) : []
  const athletesCount = athletesCountRes.status === "fulfilled" ? (athletesCountRes.value.count ?? athletes.length) : athletes.length
  const userTenants = userTenantsRes.status === "fulfilled" ? (userTenantsRes.value.data ?? []) : []
  const cashRows = cashRes.status === "fulfilled" ? (cashRes.value.data ?? []) : []
  const attendanceCount = attendanceRes.status === "fulfilled" ? (attendanceRes.value.count ?? 0) : 0

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  let buAyGelir = 0
  let buAyGider = 0
  cashRows.forEach((r: { tarih?: string; tur: string; tutar: number }) => {
    const d = (r.tarih ?? "").slice(0, 10)
    if (d >= thisMonthStart && d <= thisMonthEnd) {
      if (r.tur === "gelir" || r.tur === "income" || !r.tur) buAyGelir += r.tutar ?? 0
      else buAyGider += r.tutar ?? 0
    }
  })

  const toplamGelir = cashRows
    .filter((r: { tur: string }) => r.tur === "gelir" || r.tur === "income" || !r.tur)
    .reduce((s: number, r: { tutar: number }) => s + (r.tutar ?? 0), 0)

  const totalKredi = athletes.reduce((s, a) => s + ((a as { ders_kredisi?: number }).ders_kredisi ?? 0), 0)

  return (
    <div className="space-y-6">
      <Link
        href="/patron/tenants"
        className="text-sm text-[#00d4ff]/80 hover:text-[#00d4ff]"
      >
        ← Tenantlara dön
      </Link>
      <TenantDetail
        tenant={{
          id: tenant.id,
          ad: tenant.ad ?? "",
          slug: tenant.slug ?? "",
          durum: tenant.durum ?? "",
          token_balance: tenant.token_balance ?? 0,
          setup_completed: tenant.setup_completed ?? false,
          sehir: sehir ?? "—",
          ilce: ilce ?? "—",
          telefon: telefon ?? "—",
        }}
        athletes_count={athletesCount}
        athletes_last5={athletes}
        user_tenants_count={userTenants.length}
        user_tenants={userTenants}
        kasa={{ bu_ay_gelir: buAyGelir, bu_ay_gider: buAyGider }}
        toplam_gelir={toplamGelir}
        attendance_count={attendanceCount}
        kredi={{ toplam_aktif: totalKredi, son_kayitlar: athletes }}
      />
    </div>
  )
}
