/**
 * /api/havuz — Havuz listesi + onay/red
 * GET:   Direktorlerin urettigi isleri listele (celf_tasks + celf_epics, status=completed)
 * PATCH: Patron notu ekle, onayla/reddet
 */

import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "completed"
    const directorate = searchParams.get("directorate")
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)

    const supabase = createAdminClient()

    let query = supabase
      .from("celf_tasks")
      .select("id, epic_id, directorate, ai_provider, task_description, status, output_type, output_result, token_cost, apply_status, applied_at, completed_at, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (status !== "all") {
      query = query.eq("status", status)
    }
    if (directorate) {
      query = query.eq("directorate", directorate)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch related epics for context
    const epicIds = [...new Set((data ?? []).map((t) => t.epic_id).filter(Boolean))]
    const epicsMap: Record<string, { title: string; patron_command: string }> = {}

    if (epicIds.length > 0) {
      const { data: epics } = await supabase
        .from("celf_epics")
        .select("id, title, patron_command")
        .in("id", epicIds)

      for (const e of epics ?? []) {
        epicsMap[e.id as string] = {
          title: (e.title as string) || "",
          patron_command: (e.patron_command as string) || "",
        }
      }
    }

    const tasks = (data ?? []).map((t) => ({
      ...t,
      epic: epicsMap[t.epic_id as string] ?? null,
    }))

    return NextResponse.json({ tasks, total: tasks.length })
  } catch (e) {
    console.error("[havuz] GET error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === "string" ? body.id.trim() : ""
    const action = typeof body.action === "string" ? body.action.trim() : ""
    const note = typeof body.note === "string" ? body.note.trim() : ""

    if (!id) {
      return NextResponse.json({ error: "id zorunlu" }, { status: 400 })
    }
    if (!["approve", "reject", "note"].includes(action)) {
      return NextResponse.json({ error: "action: approve | reject | note" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (action === "approve") {
      updates.apply_status = "approved"
      updates.applied_at = new Date().toISOString()
    } else if (action === "reject") {
      updates.apply_status = "rejected"
    }

    if (note) {
      // Append patron note to output_result
      const { data: existing } = await supabase
        .from("celf_tasks")
        .select("output_result")
        .eq("id", id)
        .single()

      const prevResult = (existing?.output_result as Record<string, unknown>) || {}
      const prevNotes = Array.isArray(prevResult.patron_notes) ? prevResult.patron_notes : []
      updates.output_result = {
        ...prevResult,
        patron_notes: [...prevNotes, { note, ts: new Date().toISOString() }],
      }
    }

    const { data, error } = await supabase
      .from("celf_tasks")
      .update(updates)
      .eq("id", id)
      .select("id, status, apply_status, output_result, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task: data })
  } catch (e) {
    console.error("[havuz] PATCH error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
