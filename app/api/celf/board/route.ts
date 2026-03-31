import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { runLeaseExpireCheck } from "@/lib/celf/lease-check"
import { slugToCode } from "@/lib/direktorlukler/config"

export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    await runLeaseExpireCheck()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const directorate = searchParams.get("directorate")
    const target = searchParams.get("target")
    const provider = searchParams.get("provider")

    const supabase = createAdminClient()
    let q = supabase
      .from("celf_tasks")
      .select(`
        *,
        epic:celf_epics(id, title, raw_command)
      `)
      .order("created_at", { ascending: false })

    if (status) q = q.eq("status", status)
    if (directorate) {
      const code = slugToCode(directorate)
      q = q.eq("directorate", code ?? directorate)
    }
    if (target) q = q.eq("target", target)
    if (provider) q = q.eq("provider", provider)

    const { data, error } = await q

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { directorate, task_description } = body

  if (!task_description || !directorate) {
    return NextResponse.json({ error: "directorate ve task_description zorunlu" }, { status: 400 })
  }

  const supabase = createAdminClient()

  /* Find or create a default epic for manual/ad-hoc tasks */
  const MANUAL_EPIC_TITLE = "Manuel Görevler"
  let epicId: string | null = null

  const { data: existing } = await supabase
    .from("celf_epics")
    .select("id")
    .eq("title", MANUAL_EPIC_TITLE)
    .limit(1)
    .single()

  if (existing?.id) {
    epicId = existing.id
  } else {
    const { data: created } = await supabase
      .from("celf_epics")
      .insert({
        title: MANUAL_EPIC_TITLE,
        raw_command: "manual",
        patron_command: "Manuel gorev olusturma",
        status: "in_progress",
      })
      .select("id")
      .single()
    epicId = created?.id ?? null
  }

  if (!epicId) {
    return NextResponse.json({ error: "Epic oluşturulamadı" }, { status: 500 })
  }

  const dirCode = slugToCode(directorate) ?? directorate

  const { data, error } = await supabase
    .from("celf_tasks")
    .insert({
      epic_id: epicId,
      directorate: dirCode,
      title: task_description.slice(0, 100),
      task_description,
      ai_provider: "manual",
      provider: "manual",
      target: "patron_internal",
      status: "queued",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, data })
}
