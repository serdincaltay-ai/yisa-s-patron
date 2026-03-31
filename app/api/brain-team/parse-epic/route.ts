// app/api/brain-team/parse-epic/route.ts
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { withErrorHandling, AuthenticationError, ValidationError } from "@/lib/errors"
import { callClaude, callGemini } from "@/lib/ai-providers"

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")

    const body = await request.json().catch(() => ({}))
    const patron_command = body?.patron_command
    if (typeof patron_command !== "string" || !patron_command.trim()) {
      throw new ValidationError("patron_command zorunludur (string)")
    }

    const supabase = createAdminClient()

    // 1–3. celf_epics INSERT
    const { data: epic, error: epicError } = await supabase
      .from("celf_epics")
      .insert({
        patron_command: patron_command.trim(),
        status: "parsing",
      })
      .select()
      .single()

    if (epicError || !epic) {
      return NextResponse.json({ error: "Epic oluşturulamadı" }, { status: 500 })
    }

    // 4. Claude: Hangi direktörlükler çalışmalı?
    const claudePrompt = `Patron Komutu: ${patron_command.trim()}. Hangi direktörlükler çalışmalı? CTO, CFO, CMO, CSPO, CPO, CDO, CHRO, CLO, CSO, CISO, CCO, CRDO'dan seç. JSON formatında yanıt ver: {"directorates": [...], "reasoning": "..."}`
    const claudeResult = await callClaude(
      claudePrompt,
      "Sen YİSA-S sisteminin stratejik analizcisisin."
    )

    // 5. Gemini: Doğrula, eksik var mı?
    const geminiPrompt = `Claude'un önerisi: ${JSON.stringify(claudeResult)}. Eksik direktörlük var mı? JSON formatında yanıt ver: {"directorates": [...], "added": [...], "removed": [...]}`
    const geminiResult = await callGemini(
      geminiPrompt,
      "Sen YİSA-S sisteminin araştırma uzmanısın."
    )

    // 6. Sonuçları birleştir
    let finalDirectorates: string[] = []
    try {
      const claudeParsed =
        typeof claudeResult.plan === "string"
          ? JSON.parse(claudeResult.plan)
          : claudeResult.plan
      const geminiParsed =
        typeof geminiResult.plan === "string"
          ? JSON.parse(geminiResult.plan)
          : geminiResult.plan
      finalDirectorates =
        geminiParsed?.directorates ?? claudeParsed?.directorates ?? []
    } catch {
      finalDirectorates = ["CTO", "CFO", "CMO"]
    }

    const { error: updateError } = await supabase
      .from("celf_epics")
      .update({
        parsed_directorates: finalDirectorates,
        total_tasks: finalDirectorates.length,
        status: "distributed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", epic.id)

    if (updateError) {
      return NextResponse.json({ error: "Epic güncellenemedi" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      epic_id: epic.id,
      directorates: finalDirectorates,
      claude_reasoning: claudeResult.plan,
      gemini_validation: geminiResult.plan,
    })
  })
}
