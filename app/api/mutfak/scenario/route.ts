/**
 * /api/mutfak/scenario — Senaryo yonetimi
 * GET:   Patron senaryolarini listele
 * POST:  Yeni senaryo olustur
 * PATCH: Senaryoyu guncelle (duzeltme notu ekle)
 */

import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("celf_epics")
      .select("id, title, raw_command, patron_command, status, parsed_directorates, total_tasks, completed_tasks, approval_status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scenarios: data ?? [] })
  } catch (e) {
    console.error("[mutfak/scenario] GET error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const command = typeof body.command === "string" ? body.command.trim() : ""

    if (!title) {
      return NextResponse.json({ error: "title zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("celf_epics")
      .insert({
        title: title.slice(0, 100),
        raw_command: command || title,
        patron_command: command || title,
        status: "draft",
      })
      .select("id, title, status, created_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scenario: data })
  } catch (e) {
    console.error("[mutfak/scenario] POST error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === "string" ? body.id.trim() : ""
    const note = typeof body.note === "string" ? body.note.trim() : ""
    const status = typeof body.status === "string" ? body.status.trim() : ""

    if (!id) {
      return NextResponse.json({ error: "id zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (note) {
      // Append note to existing raw_command as correction
      const { data: existing } = await supabase
        .from("celf_epics")
        .select("raw_command")
        .eq("id", id)
        .single()

      const prev = (existing?.raw_command as string) || ""
      updates.raw_command = `${prev}\n\n[DUZELTME] ${note}`
    }

    if (status) {
      const validStatuses = ["draft", "parsing", "distributed", "in_progress", "done", "cancelled"]
      if (validStatuses.includes(status)) {
        updates.status = status
      }
    }

    const { data, error } = await supabase
      .from("celf_epics")
      .update(updates)
      .eq("id", id)
      .select("id, title, status, raw_command, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ scenario: data })
  } catch (e) {
    console.error("[mutfak/scenario] PATCH error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
