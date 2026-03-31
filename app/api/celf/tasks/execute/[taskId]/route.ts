import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import {
  callClaude,
  callGPT,
  callGemini,
  callTogether,
  callCursor,
  callV0,
  callFalAI,
} from "@/lib/ai-providers"
import type { CelfOutput } from "@/lib/ai-providers"
import { DIRECTORATE_PROTOCOLS } from "@/lib/robots/directorates/protocols"
import type { DirectorateCode } from "@/lib/robots/directorates/protocols"

const AUTO_PROVIDERS = ["claude", "gpt", "gemini", "together", "cursor", "v0", "fal"]

/** Build a directorate-aware system prompt for the AI provider */
function buildSystemPrompt(directorate: string): string {
  const code = (directorate || "").toUpperCase() as DirectorateCode
  const protocol = DIRECTORATE_PROTOCOLS[code]
  if (!protocol) return ""
  return `${protocol.systemPrompt}\n\nCikti formatin: ${protocol.outputFormat}\nKonu alanlarin: ${protocol.canAnswer.join(", ")}\nKonu disin: ${protocol.outOfScope.join(", ")}\n\nYanitini SADECE su JSON formatinda ver: {"plan":"...","oneriler":["..."],"dosyalar":[{"path":"...","aciklama":"..."}],"kabul_kriterleri":["..."]}`
}

/** Detect output type from AI response */
function detectOutputType(
  plan: string,
  directorate: string
): "sql" | "json" | "text" | "design" | "image" | "code" {
  if (
    plan.trim().toUpperCase().startsWith("SELECT") ||
    /^\s*insert\s+/i.test(plan) ||
    /^\s*update\s+/i.test(plan) ||
    /^\s*alter\s+/i.test(plan) ||
    /^\s*create\s+/i.test(plan)
  ) {
    return "sql"
  }
  const code = (directorate || "").toUpperCase()
  if (code === "CTO" || code === "CISO") return "code"
  if (code === "CPO" || code === "CDO") return "design"
  if (code === "CMO" && /gorsel|image|resim/i.test(plan)) return "image"
  try {
    JSON.parse(plan)
    return "json"
  } catch {
    return "text"
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const { taskId } = await params
    if (!taskId) return NextResponse.json({ error: "taskId zorunlu" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: task, error: taskErr } = await supabase
      .from("celf_tasks")
      .select("id, epic_id, directorate, ai_provider, task_description, status")
      .eq("id", taskId)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
    }

    if (task.status !== "queued") {
      return NextResponse.json({ error: "Görev zaten işlendi veya kuyrukta değil" }, { status: 400 })
    }

    await supabase
      .from("celf_tasks")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", taskId)

    const provider = (task.ai_provider || "").toLowerCase().replace(/\s/g, "")
    const description = task.task_description || ""
    const systemPrompt = buildSystemPrompt(task.directorate || "")

    let outputResult: Record<string, unknown> = {}
    let outputType: "sql" | "json" | "text" | "design" | "image" | "code" = "text"
    let status: "completed" | "failed" | "needs_review" = "completed"
    let tokenCost = 0

    if (AUTO_PROVIDERS.includes(provider)) {
      try {
        if (provider === "v0") {
          // V0: UI/template generation
          const v0Result = await callV0(description)
          if (v0Result.success) {
            outputResult = { url: v0Result.url, code: v0Result.code, provider: "v0" }
            outputType = "design"
          } else {
            // Fallback to GPT for UI description
            const fallback = await callGPT(description, systemPrompt)
            outputResult = { plan: fallback.plan, oneriler: fallback.oneriler, provider: "v0-fallback-gpt" }
            outputType = "design"
            status = "needs_review"
          }
          tokenCost = 0.02
        } else if (provider === "fal") {
          // Fal AI: Image generation
          const falResult = await callFalAI(description)
          if (falResult.gorsel_url) {
            outputResult = {
              plan: falResult.plan,
              gorsel_url: falResult.gorsel_url,
              url: falResult.gorsel_url,
              provider: "fal",
            }
            outputType = "image"
            tokenCost = 0.04
          } else {
            outputResult = { plan: falResult.plan, oneriler: falResult.oneriler, provider: "fal" }
            outputType = "text"
            status = falResult.plan === "Hata" || falResult.plan?.startsWith("STUB") ? "failed" : "needs_review"
          }
        } else if (provider === "cursor") {
          // Cursor: Code generation (falls back to GPT)
          const cursorResult = await callCursor(description, systemPrompt)
          outputResult = {
            plan: cursorResult.plan,
            oneriler: cursorResult.oneriler,
            dosyalar: cursorResult.dosyalar,
            kabul_kriterleri: cursorResult.kabul_kriterleri,
            provider: "cursor",
          }
          outputType = "code"
          tokenCost = 0.01
        } else {
          // Standard text AI providers (claude, gpt, gemini, together)
          let result: CelfOutput
          if (provider === "claude") {
            result = await callClaude(description, systemPrompt)
            tokenCost = 0.003
          } else if (provider === "gpt") {
            result = await callGPT(description, systemPrompt)
            tokenCost = 0.0025
          } else if (provider === "gemini") {
            result = await callGemini(description, systemPrompt)
            tokenCost = 0.0001
          } else if (provider === "together") {
            result = await callTogether(description, systemPrompt)
            tokenCost = 0.0002
          } else {
            result = { plan: "Bilinmeyen provider", oneriler: [] }
          }

          const plan = result?.plan ?? ""
          outputType = detectOutputType(plan, task.directorate || "")

          outputResult = {
            plan,
            oneriler: result?.oneriler ?? [],
            dosyalar: result?.dosyalar,
            kabul_kriterleri: result?.kabul_kriterleri,
            provider,
          }
        }
      } catch (e) {
        status = "failed"
        outputResult = { error: String(e), provider }
      }
    } else {
      status = "needs_review"
      outputResult = { note: "Manuel inceleme gerekli", provider }
    }

    await supabase
      .from("celf_tasks")
      .update({
        status,
        output_result: outputResult,
        output_type: outputType,
        token_cost: tokenCost,
        completed_at: status === "completed" || status === "needs_review" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    if ((status === "completed" || status === "needs_review") && task.epic_id) {
      const { data: epic } = await supabase
        .from("celf_epics")
        .select("completed_tasks, total_tasks")
        .eq("id", task.epic_id)
        .single()
      const completed = (epic?.completed_tasks ?? 0) + 1
      const total = epic?.total_tasks ?? 1
      const approval_status = completed >= total ? "approval_pending" : undefined
      await supabase
        .from("celf_epics")
        .update({
          completed_tasks: completed,
          status: completed >= total ? "done" : "in_progress",
          ...(approval_status ? { approval_status } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.epic_id)
    }

    return NextResponse.json({
      taskId,
      status,
      output_type: outputType,
      directorate: task.directorate,
      provider,
      token_cost: tokenCost,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
