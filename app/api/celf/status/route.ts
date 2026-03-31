import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/celf/status — CELF motor durumu
 * Epic/task istatistikleri, aktif lease sayısı ve genel motor sağlığını döner.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { count: totalEpics } = await supabase
      .from("celf_epics")
      .select("id", { count: "exact", head: true })

    const { count: totalTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })

    const { count: completedTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")

    const { count: runningTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "running")

    const { count: queuedTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")

    const { count: failedTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")

    const { count: lockedTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "locked")

    const { count: reviewTasks } = await supabase
      .from("celf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "review")

    return NextResponse.json({
      engine: "celf",
      status: "operational",
      epics: { total: totalEpics ?? 0 },
      tasks: {
        total: totalTasks ?? 0,
        completed: completedTasks ?? 0,
        running: runningTasks ?? 0,
        queued: queuedTasks ?? 0,
        failed: failedTasks ?? 0,
        locked: lockedTasks ?? 0,
        review: reviewTasks ?? 0,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
