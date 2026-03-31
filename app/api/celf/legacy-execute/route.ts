import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import {
  callClaude,
  callGPT,
  callGemini,
  callTogether,
  callFalAI,
} from "@/lib/ai-providers"
import {
  DIRECTORATE_AI_MAP,
  DIRECTORATE_DESIGN_MAP,
  DIRECTORATE_SYSTEM_PROMPTS,
} from "@/lib/celf-directorate-config"

function getTaskTitle(task: Record<string, unknown>): string {
  if (typeof task.title === "string" && task.title.trim()) return task.title.trim()
  if (typeof task.task_description === "string" && task.task_description.trim()) {
    return task.task_description.trim().slice(0, 200)
  }
  if (typeof task.input === "string") {
    try {
      const o = JSON.parse(task.input) as { title?: string }
      return (o?.title ?? "").trim() || "Görev"
    } catch {
      return (task.input as string).slice(0, 200) || "Görev"
    }
  }
  return "Görev"
}

function getTaskDescription(task: Record<string, unknown>): string {
  if (typeof task.description === "string" && task.description.trim()) return task.description.trim()
  if (typeof task.input === "string") {
    try {
      const o = JSON.parse(task.input) as { description?: string }
      return (o?.description ?? "").trim()
    } catch {
      return ""
    }
  }
  return ""
}

/**
 * POST /api/celf/legacy-execute — v1 execute endpoint (ceo_tasks + celf_logs)
 *
 * Eski ceo_tasks tablosundaki görevleri AI ile çalıştırır.
 * Yeni görevler için /api/celf/tasks/execute/[taskId] kullanın.
 * Body: { task_id }
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const task_id = body?.task_id
    if (!task_id) return NextResponse.json({ error: "task_id zorunludur" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: task, error: taskErr } = await supabase
      .from("ceo_tasks")
      .select("id, title, description, task_description, scope")
      .eq("id", task_id)
      .single()

    if (taskErr || !task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

    const { data: logs } = await supabase
      .from("celf_logs")
      .select("id, directorate_code")
      .eq("task_id", task_id)
      .eq("stage", "parsed")
    const list = logs ?? []

    const title = getTaskTitle(task as Record<string, unknown>)
    const description = getTaskDescription(task as Record<string, unknown>)
    const scope = (task.scope ?? "global") as string
    const basePrompt = `Görev: ${title}\n${description ? `Açıklama: ${description}\n` : ""}Kapsam: ${scope}`

    let updated = 0
    let failed = 0

    for (const log of list) {
      const code = log.directorate_code as string
      const provider = DIRECTORATE_AI_MAP[code] ?? "gpt"
      const systemPrompt = DIRECTORATE_SYSTEM_PROMPTS[code]
      const fullPrompt = `${basePrompt}\n\nDirektörlük: ${code}\n\nYanıtını SADECE şu JSON formatında ver: {plan, oneriler, dosyalar, kabul_kriterleri}`

      try {
        let output: Awaited<ReturnType<typeof callClaude>>
        switch (provider) {
          case "claude":
            output = await callClaude(fullPrompt, systemPrompt)
            break
          case "gpt":
            output = await callGPT(fullPrompt, systemPrompt)
            break
          case "gemini":
            output = await callGemini(fullPrompt, systemPrompt)
            break
          case "together":
            output = await callTogether(fullPrompt, systemPrompt)
            break
          default:
            output = await callGPT(fullPrompt, systemPrompt)
        }

        const designProvider = DIRECTORATE_DESIGN_MAP[code]
        if (designProvider === "fal_ai" && output.plan && !output.gorsel_url) {
          const falRes = await callFalAI(
            output.plan.slice(0, 500) || `YİSA-S ${code} görsel`
          )
          if (falRes.gorsel_url) {
            output = { ...output, gorsel_url: falRes.gorsel_url }
          }
        }

        const content = {
          plan: output.plan,
          oneriler: output.oneriler,
          dosyalar: output.dosyalar,
          kabul_kriterleri: output.kabul_kriterleri,
          gorsel_url: output.gorsel_url,
        }

        const { error: updateErr } = await supabase
          .from("celf_logs")
          .update({
            content,
            stage: "executed",
            status: "done",
            ai_provider: provider,
          })
          .eq("id", log.id)

        if (updateErr) {
          failed++
          await supabase
            .from("celf_logs")
            .update({
              content: { plan: "Hata", oneriler: [updateErr.message] },
              stage: "executed",
              status: "failed",
              ai_provider: provider,
            })
            .eq("id", log.id)
        } else {
          updated++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        failed++
        await supabase
          .from("celf_logs")
          .update({
            content: { plan: "Hata", oneriler: [msg] },
            stage: "executed",
            status: "failed",
            ai_provider: provider,
          })
          .eq("id", log.id)
      }
    }

    return NextResponse.json({
      ok: true,
      task_id,
      updated,
      failed,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
