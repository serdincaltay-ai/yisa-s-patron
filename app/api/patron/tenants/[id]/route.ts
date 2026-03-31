import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError, NotFoundError } from "@/lib/errors"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/patron/tenants/[id] — Tek tenant detay + ilişkili veriler
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")
    const supabase = createAdminClient()

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single()

    if (tenantErr || !tenant) throw new NotFoundError("Tenant bulunamadı")

    const settings = (tenant.settings as Record<string, unknown>) ?? {}
    const sehir = (settings.sehir ?? tenant.sehir) as string | undefined
    const ilce = (settings.ilce ?? tenant.ilce) as string | undefined
    const telefon = (settings.telefon ?? settings.owner_phone ?? tenant.telefon) as string | undefined

    const [
      athletesRes,
      userTenantsRes,
      cashRes,
      paymentsRes,
    ] = await Promise.all([
      supabase.from("athletes").select("id, name, surname, status, ders_kredisi").eq("tenant_id", id).order("id", { ascending: false }).limit(5),
      supabase.from("user_tenants").select("id, user_id, role").eq("tenant_id", id),
      supabase.from("cash_register").select("id, tarih, tur, tutar").eq("tenant_id", id),
      supabase.from("payments").select("id, amount, status").eq("tenant_id", id),
    ])

    const athletes = athletesRes.data ?? []
    const userTenants = userTenantsRes.data ?? []
    const cashRows = cashRes.data ?? []
    const payments = paymentsRes.data ?? []

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

    const { count: athletesCount } = await supabase
      .from("athletes")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", id)
    const { count: attendanceCount } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", id)
    const totalKredi = athletes.reduce((s, a) => s + ((a as { ders_kredisi?: number }).ders_kredisi ?? 0), 0)

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        ad: tenant.ad ?? "",
        slug: tenant.slug ?? "",
        durum: tenant.durum ?? "",
        token_balance: tenant.token_balance ?? 0,
        setup_completed: tenant.setup_completed ?? false,
        owner_id: tenant.owner_id ?? null,
        sehir: sehir ?? "—",
        ilce: ilce ?? "—",
        telefon: telefon ?? "—",
      },
      athletes_count: athletesCount ?? 0,
      athletes_last5: athletes,
      user_tenants_count: userTenants.length,
      user_tenants: userTenants,
      kasa: { bu_ay_gelir: buAyGelir, bu_ay_gider: buAyGider },
      toplam_gelir: cashRows
        .filter((r: { tur: string }) => r.tur === "gelir" || r.tur === "income" || !r.tur)
        .reduce((s: number, r: { tutar: number }) => s + (r.tutar ?? 0), 0),
      attendance_count: attendanceCount ?? 0,
      kredi: { toplam_aktif: totalKredi, son_kayitlar: athletes },
    })
  })
}
