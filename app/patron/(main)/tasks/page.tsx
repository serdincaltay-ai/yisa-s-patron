import { createAdminClient } from "@/lib/supabase/admin"
import TasksKanban from "./TasksKanban"

export const metadata = {
  title: "Görev Yönetimi | YİSA-S Patron",
  description: "CEO görevleri Kanban",
}

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

export default async function PatronTasksPage() {
  const supabase = createAdminClient()
  const [tasksRes, tenantsRes] = await Promise.all([
    supabase
      .from("ceo_tasks")
      .select("id, title, description, task_description, task_type, director_key, scope, priority, status, approved_at, approved_by, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("tenants").select("id, ad, slug, durum").order("slug"),
  ])
  const tasks = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    input: JSON.stringify({
      title: (t.title as string | null) || (t.task_description as string | null) || "—",
      description: (t.description as string | null) || "",
    }),
    task_type: t.task_type ?? "manual",
    target_robot: t.director_key ?? "celf",
    scope: t.scope ?? "global",
    priority: t.priority ?? 1,
    status: mapDbStatusToKanban((t.status ?? "pending") as string),
    approved_at: t.approved_at ?? null,
    approved_by: t.approved_by ?? null,
    created_at: t.created_at ?? null,
  }))
  const tenants = (tenantsRes.data ?? []).map((t) => ({
    id: t.id,
    ad: (t.ad ?? "") as string,
    slug: t.slug ?? "",
    durum: t.durum ?? "",
  }))
  return (
    <div className="space-y-6">
      <TasksKanban initialTasks={tasks} tenants={tenants} />
    </div>
  )
}
