import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_assignments")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { task_type, description, assigned_to, assigned_model, cost_per_run, is_routine, auto_execute, decided_by_discussion } = body

  if (!task_type || !description || !assigned_to) {
    return NextResponse.json({ error: "task_type, description ve assigned_to zorunlu" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_assignments")
    .insert({
      task_type,
      description,
      assigned_to,
      assigned_model: assigned_model || null,
      cost_per_run: cost_per_run || 0,
      is_routine: is_routine || false,
      auto_execute: auto_execute || false,
      decided_by_discussion: decided_by_discussion || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("task_assignments")
    .update({ ...updates, last_run_at: new Date().toISOString(), run_count: undefined })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from("task_assignments").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
