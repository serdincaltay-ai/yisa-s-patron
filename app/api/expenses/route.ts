import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { getUserRole } from "@/lib/middleware/role-auth"

/**
 * GET: Gider listesi (pagination, tenant_id filtresi)
 * POST: Yeni gider ekle
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get("tenant_id")
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10) || 20)
  const offset = parseInt(searchParams.get("offset") || "0", 10) || 0

  const supabase = createAdminClient()
  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .order("expense_date", { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId) query = query.eq("tenant_id", tenantId)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [], count: count ?? 0 })
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const {
    tenant_id,
    amount,
    category,
    description,
    expense_date,
    type,
    is_fixed,
    billing_period,
    next_due_date,
    reminder_days_before,
    is_active,
    vendor,
    invoice_ref,
  } = body

  if (amount == null || isNaN(Number(amount))) {
    return NextResponse.json({ error: "amount zorunlu ve sayı olmalı" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      tenant_id: tenant_id || (await getUserRole()).tenantId || null,
      amount: Number(amount),
      category: category || null,
      description: description || null,
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      type: type || "gider",
      is_fixed: Boolean(is_fixed),
      billing_period:
        billing_period === "monthly" ||
        billing_period === "quarterly" ||
        billing_period === "yearly" ||
        billing_period === "one_time"
          ? billing_period
          : null,
      next_due_date: next_due_date || null,
      reminder_days_before: Math.max(0, Number(reminder_days_before) || 7),
      is_active: is_active !== false,
      vendor: vendor || null,
      invoice_ref: invoice_ref || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
