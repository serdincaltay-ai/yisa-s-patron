import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * Beyin Takimi durum API'si
 * - director_rules tablosundan aktif direktoerler
 * - celf_tasks / ceo_tasks tablosundan calisan gorevler
 * - output_result ozetleri
 */
export async function GET() {
  try {
    const ok = await requirePatron()
    if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

    const supabase = createAdminClient()

    // 1) director_rules tablosundan aktif kurallari getir
    const { data: directorRulesRaw, error: rulesErr } = await supabase
      .from("director_rules")
      .select("id, director_key, data_access, triggers, has_veto, updated_at")
      .order("director_key", { ascending: true })

    // 2) celf_tasks tablosundan calisan gorevleri getir
    const { data: runningTasks, error: runningErr } = await supabase
      .from("celf_tasks")
      .select("id, directorate, ai_provider, task_description, status, output_result, output_type, completed_at, updated_at")
      .in("status", ["running", "queued", "completed"])
      .order("updated_at", { ascending: false })
      .limit(30)

    // 3) ceo_tasks tablosundan son gorevleri getir (fallback/ek veri)
    const { data: ceoTasksRaw, error: ceoErr } = await supabase
      .from("ceo_tasks")
      .select("id, director_key, task_description, result_payload, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20)

    const directorRules = (directorRulesRaw ?? []).map((rule) => ({
      id: rule.id,
      directorate: rule.director_key as string,
      data_access: rule.data_access,
      trigger_keywords: rule.triggers,
      has_veto: Boolean(rule.has_veto),
      created_at: (rule.updated_at as string | null) ?? new Date(0).toISOString(),
    }))

    const ceoTasks = (ceoTasksRaw ?? []).map((task) => ({
      id: task.id,
      directorate: (task.director_key as string) || "CSO",
      prompt: (task.task_description as string) || "",
      result_payload: task.result_payload as Record<string, unknown> | null,
      status: (task.status as string) || "pending",
      created_at: (task.created_at as string | null) ?? null,
    }))

    // Direktoerluk bazinda durum hesapla
    const directorateStatus: Record<string, {
      active: boolean
      hasRules: boolean
      runningCount: number
      completedCount: number
      lastOutput: string | null
      lastActivity: string | null
    }> = {}

    // director_rules bazinda aktiflik
    for (const rule of directorRules ?? []) {
      const dir = rule.directorate as string
      if (!directorateStatus[dir]) {
        directorateStatus[dir] = {
          active: true,
          hasRules: true,
          runningCount: 0,
          completedCount: 0,
          lastOutput: null,
          lastActivity: rule.created_at as string | null,
        }
      }
    }

    // celf_tasks bazinda calisma durumu
    for (const task of runningTasks ?? []) {
      const dir = task.directorate as string
      if (!directorateStatus[dir]) {
        directorateStatus[dir] = {
          active: false,
          hasRules: false,
          runningCount: 0,
          completedCount: 0,
          lastOutput: null,
          lastActivity: null,
        }
      }
      if (task.status === "running" || task.status === "queued") {
        directorateStatus[dir].runningCount++
        directorateStatus[dir].active = true
      }
      if (task.status === "completed") {
        directorateStatus[dir].completedCount++
        // Son ciktiyi kaydet
        const output = task.output_result as Record<string, unknown> | null
        if (output) {
          const plan = (output.plan as string) || (output.note as string) || ""
          directorateStatus[dir].lastOutput = plan.slice(0, 200) || null
        }
      }
      if (task.updated_at) {
        directorateStatus[dir].lastActivity = task.updated_at as string
      }
    }

    // ceo_tasks bazinda ek veri
    for (const task of ceoTasks ?? []) {
      const dir = task.directorate as string
      if (!directorateStatus[dir]) {
        directorateStatus[dir] = {
          active: false,
          hasRules: false,
          runningCount: 0,
          completedCount: 0,
          lastOutput: null,
          lastActivity: null,
        }
      }
      if (task.status === "completed" || task.status === "done") {
        directorateStatus[dir].completedCount++
        if (!directorateStatus[dir].lastOutput && task.result_payload) {
          const payload = task.result_payload as Record<string, unknown>
          const plan = (payload.plan as string) || ""
          directorateStatus[dir].lastOutput = plan.slice(0, 200) || null
        }
      }
      if (!directorateStatus[dir].lastActivity && task.created_at) {
        directorateStatus[dir].lastActivity = task.created_at as string
      }
    }

    return NextResponse.json({
      directorRules: directorRules ?? [],
      directorateStatus,
      runningTasks: (runningTasks ?? []).filter((t) => t.status === "running" || t.status === "queued"),
      recentCompleted: (runningTasks ?? []).filter((t) => t.status === "completed").slice(0, 5),
      ceoTasksSummary: (ceoTasks ?? []).slice(0, 10),
      errors: {
        rules: rulesErr?.message ?? null,
        tasks: runningErr?.message ?? null,
        ceo: ceoErr?.message ?? null,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
