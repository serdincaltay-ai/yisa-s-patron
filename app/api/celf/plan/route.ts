import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import {
  selectTarget,
  selectDirectorates,
  getProviderForDirectorate,
} from "@/lib/celf/c2-plan-rules"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { epic_id } = body
    if (!epic_id) return NextResponse.json({ error: "epic_id zorunlu" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: epic, error: epicErr } = await supabase
      .from("celf_epics")
      .select("id, raw_command")
      .eq("id", epic_id)
      .single()

    if (epicErr || !epic) {
      return NextResponse.json({ error: "Epic bulunamadı" }, { status: 404 })
    }

    const text = epic.raw_command || ""
    const target = selectTarget(text)
    const directorates = selectDirectorates(text)

    const tasks: { id: string; title: string; directorate_code: string; provider: string; target: string }[] = []

    for (const code of directorates) {
      const provider = getProviderForDirectorate(code)
      const taskTitle = `${code}: ${text.slice(0, 60)}${text.length > 60 ? "..." : ""}`

      const { data: task, error: taskErr } = await supabase
        .from("celf_tasks")
        .insert({
          epic_id,
          title: taskTitle,
          directorate_code: code,
          provider,
          target,
          status: "queued",
        })
        .select("id, title, directorate_code, provider, target")
        .single()

      if (!taskErr && task) {
        tasks.push(task)
        await supabase.from("celf_events").insert({
          epic_id,
          task_id: task.id,
          event_type: "TASK_CREATED",
          meta: { directorate: code, provider },
        })
      }
    }

    await supabase
      .from("celf_epics")
      .update({ status: "planned", updated_at: new Date().toISOString() })
      .eq("id", epic_id)

    return NextResponse.json({ tasks })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
