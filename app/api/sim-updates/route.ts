import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sim_updates")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { decision_id, target_robot, target_direktorluk, command } = body

  if (!target_robot || !command) {
    return NextResponse.json({ error: "target_robot ve command zorunlu" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sim_updates")
    .insert({ decision_id, target_robot, target_direktorluk, command, status: "beklemede" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json({ error: "id ve status zorunlu" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sim_updates")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
