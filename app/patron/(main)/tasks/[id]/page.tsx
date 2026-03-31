import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import TaskDetailClient from "./TaskDetailClient"

function mapDbStatusToKanban(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "BACKLOG"
    case "assigned":
      return "READY"
    case "awaiting_approval":
      return "REVIEW"
    case "completed":
      return "DONE"
    case "cancelled":
      return "BLOCKED"
    default:
      return status ?? "BACKLOG"
  }
}

export default async function PatronTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()
  const [taskRes, logsRes, dirsRes] = await Promise.all([
    supabase.from("ceo_tasks").select("*").eq("id", id).single(),
    supabase.from("celf_logs").select("*").eq("task_id", id).order("directorate_code"),
    supabase.from("celf_directorates").select("id, kod, isim").order("kod"),
  ])
  if (taskRes.error || !taskRes.data) notFound()
  const row = taskRes.data as Record<string, unknown>
  const task = {
    id: String(row.id ?? ""),
    input: JSON.stringify({
      title: String(row.title ?? row.task_description ?? "—"),
      description: String(row.description ?? ""),
    }),
    task_type: String(row.task_type ?? "manual"),
    target_robot: String(row.director_key ?? "celf"),
    scope: String(row.scope ?? "global"),
    priority: Number(row.priority ?? 1),
    status: mapDbStatusToKanban(String(row.status ?? "pending")),
    approved_at: (row.approved_at as string | null) ?? null,
    approved_by: (row.approved_by as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  }
  const logs = (logsRes.data ?? []) as Array<{
    id: string
    task_id: string
    directorate_code: string
    stage: string
    ai_provider: string | null
    content: unknown
    status: string
    created_at: string | null
  }>
  const dirs = (dirsRes.data ?? []) as Array<{ kod: string; isim: string }>
  const dirMap: Record<string, string> = {}
  dirs.forEach((d) => { dirMap[d.kod] = d.isim ?? d.kod })
  const directorateCodesFromLogs = [...new Set(logs.map((l) => l.directorate_code))]
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/patron/tasks"
          className="text-sm text-[#00d4ff]/80 hover:text-[#00d4ff]"
        >
          ← Görevlere dön
        </Link>
      </div>
      <TaskDetailClient
        task={task}
        logs={logs}
        dirMap={dirMap}
        directorateCodes={directorateCodesFromLogs}
      />
    </div>
  )
}
