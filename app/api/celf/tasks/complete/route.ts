import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { task_id, artifact, token_used } = body
    if (!task_id) return NextResponse.json({ error: "task_id zorunlu" }, { status: 400 })

    const art = artifact || {}
    const { type, storage, content, url, meta } = art

    const supabase = createAdminClient()

    const { data: task } = await supabase
      .from("celf_tasks")
      .select("id")
      .eq("id", task_id)
      .single()

    if (!task) return NextResponse.json({ error: "Task bulunamadı" }, { status: 404 })

    const { data: artifactRow } = await supabase
      .from("celf_artifacts")
      .insert({
        task_id,
        artifact_type: type || "markdown",
        storage: storage || "inline",
        content: content ?? null,
        url: url ?? null,
        meta: meta || {},
      })
      .select("id")
      .single()

    if (!artifactRow) return NextResponse.json({ error: "Artifact oluşturulamadı" }, { status: 500 })

    await supabase
      .from("celf_tasks")
      .update({
        status: "review",
        artifact_id: artifactRow.id,
        lock_owner_user_id: null,
        locked_at: null,
        lease_expires_at: null,
        token_used: token_used ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id)

    await supabase.from("celf_events").insert([
      { task_id, event_type: "OUTPUT_WRITTEN", meta: { artifact_id: artifactRow.id } },
      { task_id, event_type: "REVIEW_REQUESTED", meta: {} },
    ])

    return NextResponse.json({ success: true, artifact_id: artifactRow.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
