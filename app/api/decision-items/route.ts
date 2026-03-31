import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { decision_id, member_id, proposal, reasoning } = body

  if (!decision_id || !member_id || !proposal) {
    return NextResponse.json({ error: "decision_id, member_id, proposal zorunlu" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("decision_items")
    .insert({ decision_id, member_id, proposal, reasoning })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { id, vote } = body

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("decision_items")
    .update({ vote })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
