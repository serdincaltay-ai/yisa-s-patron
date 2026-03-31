import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const epicId = searchParams.get("epicId") || undefined

    const supabase = createAdminClient()

    let epicsQuery = supabase
      .from("celf_epics")
      .select("id, patron_command, raw_command, status, approval_status, parsed_directorates, total_tasks, completed_tasks, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(20)

    if (epicId) epicsQuery = epicsQuery.eq("id", epicId)

    const { data: epics, error: epicsErr } = await epicsQuery

    if (epicsErr) return NextResponse.json({ error: epicsErr.message }, { status: 500 })

    const ids = (epics ?? []).map((e) => e.id)
    const { data: tasks, error: tasksErr } = await supabase
      .from("celf_tasks")
      .select("id, epic_id, directorate, ai_provider, task_description, status, output_type, output_result, apply_status, completed_at")
      .in("epic_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])

    if (tasksErr) return NextResponse.json({ error: tasksErr.message }, { status: 500 })

    const tasksByEpic: Record<string, typeof tasks> = {}
    for (const t of tasks ?? []) {
      const eid = t.epic_id as string
      if (!tasksByEpic[eid]) tasksByEpic[eid] = []
      tasksByEpic[eid].push(t)
    }

    const directorates = ["CTO", "CFO", "CMO", "CSPO", "CPO", "CDO", "CHRO", "CLO", "CSO", "CISO", "CCO", "CRDO"]
    const allTasks = (tasks ?? []) as { status: string }[]
    const stats = {
      total: allTasks.length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      running: allTasks.filter((t) => t.status === "running").length,
      failed: allTasks.filter((t) => t.status === "failed").length,
    }

    const epicsWithTasks = (epics ?? []).map((e) => ({
      ...e,
      tasks: (tasksByEpic[e.id] ?? []).reduce((acc: Record<string, unknown[]>, t) => {
        const dir = (t.directorate as string) || "OTHER"
        if (!acc[dir]) acc[dir] = []
        acc[dir].push(t)
        return acc
      }, {}),
      tasksFlat: tasksByEpic[e.id] ?? [],
    }))

    return NextResponse.json({
      epics: epicsWithTasks,
      directorates,
      stats,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
