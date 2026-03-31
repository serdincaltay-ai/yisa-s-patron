import { createAdminClient } from "@/lib/supabase/admin"
import StatusClient from "./StatusClient"

export const metadata = {
  title: "Sistem Durumu | YİSA-S Patron",
  description: "Domain ve Supabase sağlık ekranı",
}

export default async function PatronStatusPage() {
  const supabase = createAdminClient()
  const safeCount = async (table: string) => {
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true })
    return count ?? 0
  }
  const [tenantsCount, athletesCount, attendanceCount, paymentsCount, ceoTasksCount, celfLogsCount, lastTasksRes, lastLogsRes] = await Promise.allSettled([
    safeCount("tenants"),
    safeCount("athletes"),
    safeCount("attendance"),
    safeCount("payments"),
    safeCount("ceo_tasks"),
    safeCount("celf_logs"),
    supabase
      .from("ceo_tasks")
      .select("id, title, task_description, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("celf_logs").select("id, directorate_code, stage, created_at").order("created_at", { ascending: false }).limit(5),
  ])
  const counts = {
    tenants: tenantsCount.status === "fulfilled" ? tenantsCount.value : 0,
    athletes: athletesCount.status === "fulfilled" ? athletesCount.value : 0,
    attendance: attendanceCount.status === "fulfilled" ? attendanceCount.value : 0,
    payments: paymentsCount.status === "fulfilled" ? paymentsCount.value : 0,
    ceo_tasks: ceoTasksCount.status === "fulfilled" ? ceoTasksCount.value : 0,
    celf_logs: celfLogsCount.status === "fulfilled" ? celfLogsCount.value : 0,
  }
  const lastTasksDataRaw = lastTasksRes.status === "fulfilled" && lastTasksRes.value.data ? lastTasksRes.value.data : []
  const lastLogsDataRaw = lastLogsRes.status === "fulfilled" && lastLogsRes.value.data ? lastLogsRes.value.data : []
  const lastTasksData = lastTasksDataRaw.map((t: { id: string; title?: string; task_description?: string; status: string; created_at: string | null }) => ({
    id: t.id,
    title: (t.title?.trim() || t.task_description || "—").slice(0, 50),
    status: t.status ?? "—",
    created_at: t.created_at ?? null,
  }))
  const lastLogsData = lastLogsDataRaw.map((l: { id: string; directorate_code: string; stage: string; created_at: string | null }) => ({
    id: l.id,
    directorate_code: l.directorate_code ?? "—",
    stage: l.stage ?? "—",
    created_at: l.created_at ?? null,
  }))
  return (
    <StatusClient
      counts={counts}
      lastTasks={lastTasksData}
      lastLogs={lastLogsData}
    />
  )
}
