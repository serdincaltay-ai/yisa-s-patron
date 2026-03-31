import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"

export const dynamic = "force-dynamic"

/**
 * 12 direktorluk canli durum API'si.
 * DirectorStatusBar bileseninin beklediği formatta doner:
 * { statuses: DirectorStatus[] }
 *
 * director_rules + celf_tasks + ceo_tasks tablolarindan hesaplanir.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    // 1) director_rules — hangi direktorlukler aktif kurallara sahip
    const { data: rules } = await supabase
      .from("director_rules")
      .select("director_key, has_veto, ai_providers, updated_at")

    // 2) celf_tasks — son gorevleri getir (sadece 30dk ile sinirlamiyoruz)
    const { data: recentTasks } = await supabase
      .from("celf_tasks")
      .select("directorate, status, task_description, updated_at")
      .order("updated_at", { ascending: false })
      .limit(300)

    // 3) ceo_tasks — fallback: son gorevlerden direktor bazli son aksiyon
    const { data: ceoTasksRaw } = await supabase
      .from("ceo_tasks")
      .select("director_key, status, task_description, created_at")
      .order("created_at", { ascending: false })
      .limit(300)

    const ceoTasks = (ceoTasksRaw ?? []).map((task) => ({
      directorate: (task.director_key as string) || "CSO",
      status: (task.status as string) || "pending",
      prompt: (task.task_description as string) || "",
      created_at: (task.created_at as string | null) ?? null,
    }))

    // Direktorluk bazinda durumu hesapla
    const rulesMap = new Map<string, { hasVeto: boolean; updatedAt: string | null }>()
    for (const rule of rules ?? []) {
      rulesMap.set(rule.director_key as string, {
        hasVeto: rule.has_veto as boolean,
        updatedAt: rule.updated_at as string | null,
      })
    }

    // celf_tasks bazinda calisan direktorlukler
    const tasksByDir = new Map<string, { running: number; lastAction: string | null; updatedAt: string | null }>()
    for (const task of recentTasks ?? []) {
      const dir = task.directorate as string
      if (!dir) continue
      const existing = tasksByDir.get(dir)
      const isRunning = task.status === "running" || task.status === "queued"
      if (!existing) {
        tasksByDir.set(dir, {
          running: isRunning ? 1 : 0,
          lastAction: (task.task_description as string | null)?.slice(0, 100) || null,
          updatedAt: task.updated_at as string | null,
        })
      } else if (isRunning) {
        existing.running++
      }
    }

    // ceo_tasks fallback
    const ceoByDir = new Map<string, { lastAction: string | null; createdAt: string | null }>()
    for (const task of ceoTasks ?? []) {
      const dir = task.directorate as string
      if (!dir || ceoByDir.has(dir)) continue
      ceoByDir.set(dir, {
        lastAction: (task.prompt as string | null)?.slice(0, 100) || null,
        createdAt: task.created_at as string | null,
      })
    }

    // slug -> code mapping
    const codeToSlug = new Map<string, string>()
    for (const d of DIREKTORLUKLER) {
      codeToSlug.set(d.code, d.slug)
      codeToSlug.set(d.slug, d.slug)
    }

    // Her direktorluk icin durum hesapla
    const statuses = DIREKTORLUKLER.map((d) => {
      const taskInfo = tasksByDir.get(d.code) || tasksByDir.get(d.slug)
      const ruleInfo = rulesMap.get(d.slug) || rulesMap.get(d.code)
      const ceoInfo = ceoByDir.get(d.code) || ceoByDir.get(d.slug)

      let status: "idle" | "working" | "error" | "offline" = "idle"
      let lastAction: string | null = null
      let updatedAt: string | null = null

      if (taskInfo) {
        if (taskInfo.running > 0) {
          status = "working"
        }
        lastAction = taskInfo.lastAction
        updatedAt = taskInfo.updatedAt
      }

      if (!lastAction && ceoInfo) {
        lastAction = ceoInfo.lastAction
        updatedAt = updatedAt || ceoInfo.createdAt
      }

      // Kural yoksa ve gorev de yoksa -> idle (varsayilan)
      if (ruleInfo) {
        updatedAt = updatedAt || ruleInfo.updatedAt
      }

      return {
        slug: d.slug,
        status,
        lastAction: lastAction || undefined,
        updatedAt: updatedAt || undefined,
      }
    })

    return NextResponse.json({ statuses })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
