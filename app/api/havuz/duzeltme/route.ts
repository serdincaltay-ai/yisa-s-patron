/**
 * POST /api/havuz/duzeltme
 * Duzeltme dongusu — patron duzeltme istegini ilgili agent'e yonlendirir.
 * Body: { task_id: string, note: string, directorate?: string }
 * Response: { task: updated task, re_executed: boolean }
 */

import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { callClaude, callGPT, callGemini, callTogether, callCursor, callFalAI } from "@/lib/ai-providers"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const taskId = typeof body.task_id === "string" ? body.task_id.trim() : ""
    const note = typeof body.note === "string" ? body.note.trim() : ""

    if (!taskId) {
      return NextResponse.json({ error: "task_id zorunlu" }, { status: 400 })
    }
    if (!note) {
      return NextResponse.json({ error: "note zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch existing task
    const { data: task, error: fetchErr } = await supabase
      .from("celf_tasks")
      .select("id, epic_id, directorate, ai_provider, task_description, status, output_result")
      .eq("id", taskId)
      .single()

    if (fetchErr || !task) {
      return NextResponse.json({ error: "Gorev bulunamadi" }, { status: 404 })
    }

    // Append correction note to output_result
    const prevResult = (task.output_result as Record<string, unknown>) || {}
    const prevNotes = Array.isArray(prevResult.patron_notes) ? prevResult.patron_notes : []
    const updatedNotes = [...prevNotes, { note, ts: new Date().toISOString(), type: "duzeltme" }]

    // Build correction prompt
    const originalDesc = (task.task_description as string) || ""
    const previousPlan = typeof prevResult.plan === "string" ? prevResult.plan : ""
    const correctionPrompt = `Onceki gorev: ${originalDesc}\n\nOnceki sonuc: ${previousPlan.slice(0, 500)}\n\nPatron duzeltme notu: ${note}\n\nLutfen duzeltme notuna gore gorevi tekrar uret.\nYanitini SADECE su JSON formatinda ver: {"plan":"duzeltilmis plan","oneriler":["oneri1","oneri2"]}`

    const provider = ((task.ai_provider as string) || "gemini").toLowerCase()
    let newResult: { plan: string; oneriler?: string[]; gorsel_url?: string } = { plan: "" }

    const ERROR_INDICATORS = ["Hata", "STUB (API key yok)", "Key bulunamadı"]
    function isAiError(result: { plan: string }): boolean {
      return ERROR_INDICATORS.some((e) => result.plan.startsWith(e) || result.plan === e)
    }

    if (provider === "claude") {
      newResult = await callClaude(correctionPrompt)
    } else if (provider === "gpt") {
      newResult = await callGPT(correctionPrompt)
    } else if (provider === "gemini") {
      newResult = await callGemini(correctionPrompt)
    } else if (provider === "together") {
      newResult = await callTogether(correctionPrompt)
    } else if (provider === "cursor") {
      newResult = await callCursor(correctionPrompt)
    } else if (provider === "fal") {
      newResult = await callFalAI(`${originalDesc}\n${note}`)
    } else {
      newResult = await callGemini(correctionPrompt)
    }

    const reExecuted = !isAiError(newResult)

    // Update task with correction
    const updatedOutput = {
      ...prevResult,
      plan: reExecuted ? newResult.plan : (prevResult.plan as string) || newResult.plan,
      oneriler: reExecuted ? (newResult.oneriler ?? prevResult.oneriler) : prevResult.oneriler,
      gorsel_url: newResult.gorsel_url || prevResult.gorsel_url,
      patron_notes: updatedNotes,
      last_correction: note,
      correction_count: (Number(prevResult.correction_count) || 0) + 1,
    }

    const { data: updated, error: updateErr } = await supabase
      .from("celf_tasks")
      .update({
        output_result: updatedOutput,
        status: reExecuted ? "completed" : (task.status as string),
        apply_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select("id, directorate, ai_provider, status, output_result, updated_at")
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ task: updated, re_executed: reExecuted })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    console.error("[havuz/duzeltme] Error:", err)
    return NextResponse.json({ error: "Duzeltme hatasi", detail: err }, { status: 500 })
  }
}
