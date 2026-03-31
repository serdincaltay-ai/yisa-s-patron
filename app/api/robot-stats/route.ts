/**
 * GET /api/robot-stats — Robot bazlı istatistikler
 * Patron panelinde robot durum modalı için
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

const ROBOT_IDS = ["patron", "guvenlik", "veri", "celf", "yisas"]

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const [tasksRes, simRes, tenantsRes, tokenRes] = await Promise.all([
      supabase
        .from("ceo_tasks")
        .select("id, title, task_description, status, director_key, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("sim_updates").select("id, target_robot, status, command, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("tenants").select("id, ad, slug, durum"),
      supabase.from("token_costs").select("cost_usd, member_id, created_at"),
    ])

    const tasks = tasksRes.data ?? []
    const simUpdates = simRes.data ?? []
    const tenants = tenantsRes.data ?? []

    const tokenTotal = (tokenRes.data ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)
    const thisMonth = new Date().toISOString().slice(0, 7)
    const tokenThisMonth = (tokenRes.data ?? []).filter((r) => (r.created_at ?? "").slice(0, 7) === thisMonth).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)

    const byRobot: Record<string, { tasksTotal: number; tasksDone: number; tasksPending: number; lastTask: string | null; lastTaskDate: string | null; simCount: number; tenantsCount: number }> = {}

    for (const rid of ROBOT_IDS) {
      const robotTasks = rid === "celf" ? tasks : []
      const robotSim = simUpdates.filter((u) => (u.target_robot ?? "") === rid)
      const done = robotTasks.filter((t) => t.status === "completed").length
      const pending = robotTasks.filter((t) => ["pending", "assigned", "awaiting_approval"].includes(t.status ?? "")).length

      let lastTask: string | null = null
      let lastTaskDate: string | null = null
      const last = robotTasks[0] ?? robotSim[0]
      if (last) {
        if ("title" in last || "task_description" in last) {
          lastTask = String((last as { title?: string; task_description?: string }).title
            ?? (last as { title?: string; task_description?: string }).task_description
            ?? "").slice(0, 60) || null
        } else if ("command" in last) {
          lastTask = String((last as { command?: unknown }).command ?? "").slice(0, 60)
        }
        lastTaskDate = ((last as { created_at?: string | null }).created_at) ?? null
      }

      byRobot[rid] = {
        tasksTotal: robotTasks.length,
        tasksDone: done,
        tasksPending: pending,
        lastTask,
        lastTaskDate,
        simCount: robotSim.length,
        tenantsCount: ["yisas", "celf"].includes(rid) ? tenants.length : 0,
      }
    }

    return NextResponse.json({
      byRobot,
      tokenTotal: Math.round(tokenTotal * 1000) / 1000,
      tokenThisMonth: Math.round(tokenThisMonth * 1000) / 1000,
      tenantsCount: tenants.length,
    })
  } catch (e) {
    console.error("robot-stats API error:", e)
    return NextResponse.json(
      { byRobot: {}, tokenTotal: 0, tokenThisMonth: 0, tenantsCount: 0 },
      { status: 500 }
    )
  }
}
