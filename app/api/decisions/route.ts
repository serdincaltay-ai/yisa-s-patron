import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section")

  const supabase = await createClient()
  let query = supabase.from("decisions").select("*, decision_items(*)").order("created_at", { ascending: false })
  
  if (section) query = query.eq("section", section)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json()
  const { section, topic } = body

  if (!topic) return NextResponse.json({ error: "topic zorunlu" }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("decisions")
    .insert({ section: section || "genel", topic })
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

  const supabase = await createClient()
  const updates: Record<string, unknown> = { status }
  if (status === "onaylandi") updates.resolved_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("decisions")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
