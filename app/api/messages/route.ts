import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET(request: Request) {
  const patronOk = await requirePatron()
  if (!patronOk) {
    return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const section = searchParams.get("section") || "genel"

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("section", section)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const patronOk = await requirePatron()
  if (!patronOk) {
    return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })
  }

  const body = await request.json()
  const { section, member_id, text, msg_type } = body

  if (!member_id || !text) {
    return NextResponse.json({ error: "member_id ve text zorunlu" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("messages")
    .insert({ section: section || "genel", member_id, text, msg_type: msg_type || "oneri" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
