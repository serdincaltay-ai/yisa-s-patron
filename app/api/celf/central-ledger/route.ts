import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("central_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const income = (data || []).filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount || 0), 0)
    const expense = (data || []).filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0)
    const thisMonth = (data || []).filter((r) => {
      const d = new Date(r.created_at)
      const n = new Date()
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
    })
    const monthIncome = thisMonth.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount || 0), 0)
    const monthExpense = thisMonth.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount || 0), 0)

    return NextResponse.json({
      items: data || [],
      summary: { total_income: income, total_expense: expense, balance: income - expense },
      this_month: { income: monthIncome, expense: monthExpense, balance: monthIncome - monthExpense },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { amount, type, description, source } = body
    if (!amount || !type || !["income", "expense"].includes(type)) {
      return NextResponse.json({ error: "amount ve type (income|expense) zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("central_ledger")
      .insert({ amount, type, description: description || null, source: source || null })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
