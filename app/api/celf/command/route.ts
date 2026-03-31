import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { raw_command, scope = "company", tenant_id, priority = 0 } = body
    if (!raw_command || typeof raw_command !== "string") {
      return NextResponse.json({ error: "raw_command zorunlu" }, { status: 400 })
    }

    const words = raw_command.trim().split(/\s+/)
    const title = words.slice(0, Math.min(12, words.length)).join(" ") || "Yeni Epic"

    const supabase = createAdminClient()
    const { data: epic, error } = await supabase
      .from("celf_epics")
      .insert({
        title,
        raw_command: raw_command.trim(),
        scope,
        tenant_id: tenant_id || null,
        priority,
        status: "draft",
      })
      .select("id, title")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from("celf_events").insert({
      epic_id: epic.id,
      event_type: "CREATED",
      meta: {},
    })

    return NextResponse.json({ epic_id: epic.id, title: epic.title })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
