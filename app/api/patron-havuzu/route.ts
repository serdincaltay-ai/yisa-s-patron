/**
 * GET /api/patron-havuzu — 10'a Çıkart: Patron Komutları + Demo Talepleri
 * Patron onay bekleyen ceo_tasks (REVIEW) + celf_logs, demo_requests (beklemede)
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const [tasksRes, demoRes] = await Promise.all([
      supabase
        .from("ceo_tasks")
        .select("id, title, description, task_description, task_type, director_key, scope, priority, status, created_at")
        .eq("status", "awaiting_approval")
        .order("created_at", { ascending: false }),
      supabase
        .from("demo_requests")
        .select("*")
        .eq("status", "new")
        .order("created_at", { ascending: false }),
    ])

    const tasks = tasksRes.data ?? []
    const demoRequests = demoRes.data ?? []

    const taskIds = tasks.map((t) => t.id)
    const logsRes =
      taskIds.length > 0
        ? await supabase
            .from("celf_logs")
            .select("*")
            .in("task_id", taskIds)
            .order("directorate_code")
        : { data: [] }

    const logsByTask: Record<string, unknown[]> = {}
    for (const log of logsRes.data ?? []) {
      const tid = (log as { task_id: string }).task_id
      if (!logsByTask[tid]) logsByTask[tid] = []
      logsByTask[tid].push(log)
    }

    const patronCommands = tasks.map((t) => ({
      id: t.id,
      type: "patron_command" as const,
      input: JSON.stringify({
        title: (t.title as string | null) || (t.task_description as string | null) || "—",
        description: (t.description as string | null) || "",
      }),
      task_type: t.task_type ?? "manual",
      target_robot: t.director_key ?? "celf",
      scope: t.scope,
      priority: t.priority,
      status: t.status,
      created_at: t.created_at,
      logs: logsByTask[t.id] ?? [],
    }))

    const demoList = demoRequests.map((r) => ({
      id: r.id,
      type: "demo_request" as const,
      name: r.name ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      facility_type: r.facility_type ?? null,
      city: r.city ?? null,
      notes: r.notes ?? null,
      status: r.status ?? "new",
      durum: r.durum ?? null,
      created_at: r.created_at,
    }))

    return NextResponse.json({
      patronCommands,
      demoRequests: demoList,
    })
  } catch (e) {
    console.error("patron-havuzu API error:", e)
    return NextResponse.json(
      { error: (e as Error).message, patronCommands: [], demoRequests: [] },
      { status: 500 }
    )
  }
}
