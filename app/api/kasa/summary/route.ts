import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

function isMissingColumnError(error: { message?: string | null; code?: string | null } | null | undefined) {
  if (!error) return false
  const msg = String(error.message ?? "")
  return (
    error.code === "42703" ||
    /column .* does not exist/i.test(msg) ||
    /could not find the '.*' column/i.test(msg)
  )
}

/**
 * GET /api/kasa/summary — Kasa ozet verileri: gelir/gider detaylari, son 30 gun grafik verisi.
 * Payments + expenses + token_costs tablolarindan birlestirme.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const [paymentsRes, expensesRes, tokenRes, tenantsRes] = await Promise.all([
      supabase.from("payments").select("id, amount, status, created_at, tenant_id, description").order("created_at", { ascending: false }).limit(10000),
      supabase
        .from("expenses")
        .select("id, amount, type, category, description, expense_date, is_fixed, billing_period, next_due_date, reminder_days_before, is_active, vendor, invoice_ref")
        .order("expense_date", { ascending: false })
        .limit(400),
      supabase.from("token_costs").select("member_id, cost_usd, created_at").order("created_at", { ascending: false }).limit(10000),
      supabase.from("tenants").select("id, ad, slug"),
    ])

    const baseQueryError = paymentsRes.error ?? tokenRes.error ?? tenantsRes.error
    if (baseQueryError) {
      return NextResponse.json({ error: baseQueryError.message }, { status: 500 })
    }

    const payments = paymentsRes.data ?? []
    type ExpenseRow = {
      id: string
      amount: number | string | null
      type: string | null
      category: string | null
      description: string | null
      expense_date: string | null
      is_fixed?: boolean | null
      billing_period?: string | null
      next_due_date?: string | null
      reminder_days_before?: number | null
      is_active?: boolean | null
      vendor?: string | null
      invoice_ref?: string | null
    }

    let expenses: ExpenseRow[] = (expensesRes.data ?? []) as ExpenseRow[]
    if (expensesRes.error) {
      if (!isMissingColumnError(expensesRes.error)) {
        return NextResponse.json({ error: expensesRes.error.message }, { status: 500 })
      }
      const legacyExpensesRes = await supabase
        .from("expenses")
        .select("id, amount, type, category, description, expense_date")
        .order("expense_date", { ascending: false })
        .limit(400)
      if (legacyExpensesRes.error) {
        return NextResponse.json({ error: legacyExpensesRes.error.message }, { status: 500 })
      }
      expenses = ((legacyExpensesRes.data ?? []) as ExpenseRow[]).map((e) => ({
        ...e,
        is_fixed: false,
        billing_period: null,
        next_due_date: null,
        reminder_days_before: 7,
        is_active: true,
        vendor: null,
        invoice_ref: null,
      }))
    }
    const tokenRows = tokenRes.data ?? []
    const tenants = tenantsRes.data ?? []

    // --- Gelir detaylari ---
    const paidPayments = payments.filter((p) => p.status === "paid" || p.status === "onaylandi")
    const totalGelir = paidPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)

    // Tenant bazli gelir
    const tenantGelir: Record<string, { tenantId: string; name: string; total: number }> = {}
    for (const p of paidPayments) {
      const tid = p.tenant_id ?? "bilinmeyen"
      if (!tenantGelir[tid]) {
        const t = tenants.find((t) => t.id === tid)
        tenantGelir[tid] = { tenantId: tid, name: t?.ad ?? t?.slug ?? tid, total: 0 }
      }
      tenantGelir[tid].total += Number(p.amount) || 0
    }

    // Demo ucretleri vs abonelik (description'a gore tahmini ayrim)
    const demoGelirleri = paidPayments
      .filter((p) => (p.description ?? "").toLowerCase().includes("demo"))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const abonelikGelirleri = totalGelir - demoGelirleri

    // --- Gider detaylari ---
    const giderItems = expenses.filter((e) => e.type === "gider" || e.type === "expense")
    const totalGider = giderItems.reduce((s, e) => s + (Number(e.amount) || 0), 0)

    // API maliyetleri (token_costs)
    const totalApiMaliyet = tokenRows.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)

    // Ajan bazli API maliyeti
    const ajanMaliyet: Record<string, number> = {}
    for (const r of tokenRows) {
      const mid = (r.member_id ?? "other").toLowerCase()
      ajanMaliyet[mid] = (ajanMaliyet[mid] ?? 0) + (Number(r.cost_usd) || 0)
    }

    // Hosting tahmini maliyetler (sabit)
    const hostingMaliyet = {
      vercel: 20,
      supabase: 25,
      toplam: 45,
    }

    const toplamIsletmeMaliyeti = totalGider + totalApiMaliyet + hostingMaliyet.toplam

    // --- Sabit gider / fatura takibi ---
    const todayIso = new Date().toISOString().slice(0, 10)
    const fixedRows = expenses.filter((e) => Boolean(e.is_fixed) && (e.is_active ?? true) && Boolean(e.next_due_date))
    const reminders = fixedRows
      .map((e) => {
        const due = (e.next_due_date ?? "").slice(0, 10)
        if (!due) return null
        const dayMs = 1000 * 60 * 60 * 24
        const delta = Math.floor((new Date(due + "T00:00:00.000Z").getTime() - new Date(todayIso + "T00:00:00.000Z").getTime()) / dayMs)
        const remindBefore = Math.max(0, Number(e.reminder_days_before) || 7)
        const status = delta < 0 ? "overdue" : delta <= remindBefore ? "upcoming" : "normal"
        return {
          id: e.id,
          dueDate: due,
          daysLeft: delta,
          amount: Number(e.amount) || 0,
          category: e.category ?? null,
          vendor: e.vendor ?? null,
          invoiceRef: e.invoice_ref ?? null,
          billingPeriod: e.billing_period ?? null,
          status,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => a.daysLeft - b.daysLeft)

    const upcomingReminders = reminders.filter((r) => r.status === "upcoming")
    const overdueReminders = reminders.filter((r) => r.status === "overdue")

    // --- Son 30 gun grafik verisi ---
    const now = new Date()
    const dailyData: { date: string; gelir: number; gider: number }[] = []

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)

      const dayGelir = paidPayments
        .filter((p) => (p.created_at ?? "").slice(0, 10) === dateStr)
        .reduce((s, p) => s + (Number(p.amount) || 0), 0)

      const dayGider = giderItems
        .filter((e) => (e.expense_date ?? "").slice(0, 10) === dateStr)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0)

      const dayTokenCost = tokenRows
        .filter((r) => (r.created_at ?? "").slice(0, 10) === dateStr)
        .reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)

      dailyData.push({
        date: dateStr,
        gelir: Math.round(dayGelir * 100) / 100,
        gider: Math.round((dayGider + dayTokenCost) * 100) / 100,
      })
    }

    return NextResponse.json({
      gelir: {
        toplam: Math.round(totalGelir * 100) / 100,
        demo: Math.round(demoGelirleri * 100) / 100,
        abonelik: Math.round(abonelikGelirleri * 100) / 100,
        tenantBazli: Object.values(tenantGelir)
          .map((t) => ({ ...t, total: Math.round(t.total * 100) / 100 }))
          .sort((a, b) => b.total - a.total),
      },
      gider: {
        toplam: Math.round(totalGider * 100) / 100,
        apiMaliyeti: Math.round(totalApiMaliyet * 10000) / 10000,
        ajanBazli: Object.entries(ajanMaliyet)
          .map(([mid, cost]) => ({ memberId: mid, cost: Math.round(cost * 10000) / 10000 }))
          .sort((a, b) => b.cost - a.cost),
        hosting: hostingMaliyet,
        toplamIsletme: Math.round(toplamIsletmeMaliyeti * 100) / 100,
        fixed: {
          total: fixedRows.length,
          upcomingCount: upcomingReminders.length,
          overdueCount: overdueReminders.length,
          items: reminders.slice(0, 20),
        },
      },
      dailyData,
      pendingCount: payments.filter((p) => p.status === "pending").length,
    })
  } catch (e) {
    console.error("kasa/summary API error:", e)
    return NextResponse.json(
      { error: "Internal server error", gelir: {}, gider: {}, dailyData: [], pendingCount: undefined },
      { status: 500 }
    )
  }
}
