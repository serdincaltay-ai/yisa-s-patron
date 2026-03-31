import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { callClaude, callGPT, callGemini, callTogether, callCursor, callV0, callFalAI } from "@/lib/ai-providers"
import type { CelfOutput } from "@/lib/ai-providers"
import { DIRECTORATE_AI_MAP } from "@/lib/celf-directorate-config"
import { DIRECTORATE_PROTOCOLS } from "@/lib/robots/directorates/protocols"
import type { DirectorateCode } from "@/lib/robots/directorates/protocols"
import type { SupabaseClient } from "@supabase/supabase-js"

const DIRECTORATES =
  "CTO, CFO, CMO, CSPO, CPO, CDO, CHRO, CLO, CSO, CISO, CCO, CRDO"

const DIRECTORATE_KEYWORDS: Record<string, string[]> = {
  CTO: ["kod", "api", "migration", "build", "deploy", "cursor", "bug", "hata", "teknik", "veritabanı", "tablo", "sql", "sistem", "mimari", "güncelle"],
  CFO: ["maliyet", "fiyat", "bütçe", "gelir", "gider", "ödeme", "token", "fatura", "taksit", "kredi"],
  CMO: ["pazarlama", "kampanya", "reklam", "sosyal medya", "instagram", "tanıtım", "içerik"],
  CSPO: ["ürün", "spor", "branş", "antrenman", "hareket", "sporcu", "ağırlık", "weight", "branch", "beceri", "skill"],
  CPO: ["ui", "tasarım", "arayüz", "ekran", "sayfa", "design", "kullanıcı deneyimi", "panel", "gelişim paneli"],
  CDO: ["veri", "analiz", "rapor", "istatistik", "ölçüm", "data", "grafik", "kontrol"],
  CHRO: ["ik", "personel", "antrenör", "kadro", "çalışan"],
  CLO: ["hukuk", "sözleşme", "kvkk", "yasal", "mevzuat"],
  CSO: ["satış", "demo", "franchise", "tenant", "müşteri", "lead"],
  CISO: ["güvenlik", "şifre", "yetki", "rol", "izin", "audit", "log"],
  CCO: ["destek", "bildirim", "şikayet", "iletişim", "mesaj", "veli", "hatırlatma", "operasyon", "tesis", "ders programı", "yoklama", "envanter", "temizlik", "malzeme", "çalışma saatleri", "randevu"],
  CRDO: ["araştırma", "rakip", "benchmark", "trend", "yenilik"],
}

// Use canonical DIRECTORATE_AI_MAP from lib/celf-directorate-config.ts
// CRDO is not in the canonical map yet, add fallback
const DIRECTORATE_PROVIDERS: Record<string, string> = {
  ...DIRECTORATE_AI_MAP,
  CRDO: "gemini",
}

type ParsedItem = { directorate: string; ai_provider: string; task_description: string }

function parseClaudeCommandResponse(text: string): ParsedItem[] {
  const trimmed = (text || "").trim()
  // Try to find JSON array in response
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  try {
    const arr = JSON.parse(jsonMatch[0]) as unknown[]
    return (Array.isArray(arr) ? arr : []).filter((x): x is ParsedItem => {
      return !!(
        x &&
        typeof x === "object" &&
        typeof (x as ParsedItem).directorate === "string" &&
        typeof (x as ParsedItem).ai_provider === "string" &&
        typeof (x as ParsedItem).task_description === "string"
      )
    })
  } catch {
    return []
  }
}

function fallbackParse(command: string): ParsedItem[] {
  const lower = command.toLowerCase()
  const matched: ParsedItem[] = []

  for (const [dir, keywords] of Object.entries(DIRECTORATE_KEYWORDS)) {
    const hit = keywords.some((kw) => lower.includes(kw))
    if (hit) {
      matched.push({
        directorate: dir,
        ai_provider: DIRECTORATE_PROVIDERS[dir] || "claude",
        task_description: `"${command}" komutunu ${dir} perspektifinden analiz et ve sonuç üret.`,
      })
    }
  }

  // If nothing matched, assign to CTO + CDO as default
  if (matched.length === 0) {
    matched.push(
      {
        directorate: "CTO",
        ai_provider: "claude",
        task_description: `"${command}" komutunu teknik açıdan analiz et.`,
      },
      {
        directorate: "CDO",
        ai_provider: "together",
        task_description: `"${command}" komutunu veri açısından analiz et ve rapor üret.`,
      }
    )
  }

  return matched
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const command = typeof body?.command === "string" ? body.command.trim() : ""
    if (!command) return NextResponse.json({ error: "command zorunlu" }, { status: 400 })

    const confirmed = body?.confirmed !== false

    // Direktörlük ipucu: Dashboard'dan seçilen direktörlük (opsiyonel)
    const directorateHint = typeof body?.directorate_hint === "string" ? body.directorate_hint.trim() : ""

    const supabase = createAdminClient()

    const cleanCommand = command.trim().replace(/\s+/g, " ")
    const title = cleanCommand.slice(0, 80) || "Komut"
    const { data: epic, error: epicErr } = await supabase
      .from("celf_epics")
      .insert({
        title,
        raw_command: command,
        patron_command: command,
        status: "parsing",
      })
      .select("id")
      .single()

    if (epicErr || !epic) {
      return NextResponse.json({ error: epicErr?.message ?? "Epic oluşturulamadı" }, { status: 500 })
    }

    // Try Claude parse first
    let items: ParsedItem[] = []
    let parseMethod = "fallback"

    // Eğer directorate_hint varsa, sadece o direktörlüğe yönlendir (manuel seçim)
    if (directorateHint && DIRECTORATES.split(", ").includes(directorateHint.toUpperCase())) {
      const dir = directorateHint.toUpperCase()
      items = [{
        directorate: dir,
        ai_provider: DIRECTORATE_PROVIDERS[dir] || "claude",
        task_description: `"${command}" komutunu ${dir} perspektifinden analiz et ve sonuç üret.`,
      }]
      parseMethod = "directorate_hint"
      console.log(`[CELF Command] Using directorate_hint: ${dir}`)
    }

    // Hint yoksa Claude parse dene
    if (items.length === 0) try {
      const systemPrompt = `Sen YİSA-S CELF sisteminin komut parse motorusun. Direktörlükler: ${DIRECTORATES}. AI provider seçenekleri: claude, gpt, gemini, together. Yanıtını SADECE geçerli bir JSON array olarak ver. Başka hiçbir metin, açıklama, markdown yazma. Sadece JSON array.`
      const userPrompt = `Komutu analiz et ve ilgili direktörlüklere görev ata. Komut: "${command}"

Dön: [{"directorate":"CTO","ai_provider":"claude","task_description":"..."}]

SADECE JSON array, başka bir şey yazma.`

      const claudeResult = await callClaude(userPrompt, systemPrompt)
      const rawText =
        typeof (claudeResult as { plan?: string }).plan === "string"
          ? (claudeResult as { plan: string }).plan
          : JSON.stringify(claudeResult)

      console.log("[CELF Command] Claude raw:", rawText.slice(0, 300))

      items = parseClaudeCommandResponse(rawText)
      if (items.length > 0) parseMethod = "claude"
    } catch (e: unknown) {
      console.log("[CELF Command] Claude parse failed:", e)
    }

    // Fallback: keyword-based parse
    if (items.length === 0) {
      console.log("[CELF Command] Using fallback parse")
      items = fallbackParse(command)
    }

    console.log("[CELF Command] Parse method:", parseMethod, "Items:", items.length)

    // Preview mode: confirmed === false → DB'ye INSERT yapma, sadece parse sonucunu döndür
    if (!confirmed) {
      // Preview modunda oluşturulan epic'i sil (henüz task yok)
      await supabase.from("celf_epics").delete().eq("id", epic.id)
      return NextResponse.json({
        preview: true,
        tasks: items.map((item) => ({
          directorate: item.directorate,
          ai_provider: item.ai_provider,
          task_description: item.task_description,
        })),
        epicId: null,
      })
    }

    const directorates = [...new Set(items.map((i) => i.directorate))]
    const tasksToInsert = items.map((item) => ({
      epic_id: epic.id,
      directorate: item.directorate,
      ai_provider: item.ai_provider,
      task_description: item.task_description,
      status: "queued",
    }))

    const { data: insertedTasks, error: tasksErr } = await supabase
      .from("celf_tasks")
      .insert(tasksToInsert)
      .select("id, directorate, ai_provider, task_description")

    if (tasksErr) {
      await supabase.from("celf_epics").update({ status: "parsing" }).eq("id", epic.id)
      return NextResponse.json({ error: tasksErr.message }, { status: 500 })
    }

    await supabase
      .from("celf_epics")
      .update({
        parsed_directorates: directorates,
        total_tasks: insertedTasks?.length ?? 0,
        completed_tasks: 0,
        status: "distributed",
        approval_status: "preparing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", epic.id)

    // --- AUTO-EXECUTE: Tüm queued task'ları otomatik çalıştır ---
    const autoExec = body?.auto_execute !== false // default true
    const execResults: { taskId: string; directorate: string; status: string }[] = []

    if (autoExec && insertedTasks && insertedTasks.length > 0) {
      console.log("[CELF Command] Auto-executing", insertedTasks.length, "tasks")
      await supabase.from("celf_epics").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", epic.id)

      let completedCount = 0
      for (const t of insertedTasks) {
        const result = await executeTask(supabase, t.id, t.ai_provider, t.task_description, t.directorate)
        execResults.push({ taskId: t.id, directorate: t.directorate, status: result.status })
        if (result.status === "completed" || result.status === "needs_review") completedCount++
      }

      const allDone = completedCount === insertedTasks.length
      await supabase.from("celf_epics").update({
        completed_tasks: completedCount,
        status: allDone ? "done" : "in_progress",
        approval_status: allDone ? "approval_pending" : "preparing",
        updated_at: new Date().toISOString(),
      }).eq("id", epic.id)
    }

    return NextResponse.json({
      epicId: epic.id,
      parseMethod,
      autoExecuted: autoExec,
      tasks: (insertedTasks ?? []).map((t) => {
        const exec = execResults.find((r) => r.taskId === t.id)
        return {
          id: t.id,
          directorate: t.directorate,
          ai_provider: t.ai_provider,
          task_description: t.task_description,
          exec_status: exec?.status ?? "queued",
        }
      }),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/** Build directorate-specific system prompt from protocols */
function getDirectorateSystemPrompt(directorate: string): string {
  const code = (directorate || "").toUpperCase() as DirectorateCode
  const protocol = DIRECTORATE_PROTOCOLS[code]
  if (!protocol) return ""
  return `${protocol.systemPrompt}\n\nCikti formatin: ${protocol.outputFormat}\nKonu alanlarin: ${protocol.canAnswer.join(", ")}\n\nYanitini SADECE su JSON formatinda ver: {"plan":"...","oneriler":["..."],"dosyalar":[{"path":"...","aciklama":"..."}],"kabul_kriterleri":["..."]}`
}

/** Tek bir celf_tasks kaydını AI provider ile çalıştırır */
async function executeTask(
  supabase: SupabaseClient,
  taskId: string,
  aiProvider: string,
  taskDescription: string,
  directorate: string
): Promise<{ status: "completed" | "failed" | "needs_review" }> {
  const AUTO_PROVIDERS = ["claude", "gpt", "gemini", "together", "cursor", "v0", "fal"]
  const provider = (aiProvider || "").toLowerCase().replace(/\s/g, "")
  const description = taskDescription || ""
  const systemPrompt = getDirectorateSystemPrompt(directorate)

  await supabase.from("celf_tasks").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", taskId)

  let outputResult: Record<string, unknown> = {}
  let outputType: "sql" | "json" | "text" | "template" | "image" | "code" = "text"
  let status: "completed" | "failed" | "needs_review" = "completed"
  let tokenCost = 0

  if (AUTO_PROVIDERS.includes(provider)) {
    try {
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
      } else if (provider === "cursor") {
        result = await callCursor(description, systemPrompt)
        tokenCost = 0.01
      } else if (provider === "v0") {
        const v0Result = await callV0(description)
        if (v0Result.success) {
          await supabase.from("celf_tasks").update({
            status: "completed",
            output_result: { url: v0Result.url, code: v0Result.code, provider: "v0" },
            output_type: "design",
            token_cost: 0.02,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", taskId)
          console.log(`[CELF Auto-Execute] ${directorate} (v0): completed, cost: $0.02`)
          return { status: "completed" }
        }
        // Fallback to GPT
        result = await callGPT(description, systemPrompt)
        tokenCost = 0.02
        status = "needs_review"
      } else if (provider === "fal") {
        result = await callFalAI(description)
        tokenCost = 0.04
      } else {
        result = { plan: "Bilinmeyen provider", oneriler: [] }
      }

      const plan = result?.plan ?? ""
      if (provider === "fal" && result.gorsel_url) {
        outputResult = { plan, gorsel_url: result.gorsel_url, url: result.gorsel_url, provider }
        outputType = "image"
      } else if (plan.trim().toUpperCase().startsWith("SELECT") || /^\s*insert\s+/i.test(plan) || /^\s*update\s+/i.test(plan)) {
        outputResult = { sql: plan, provider }
        outputType = "sql"
      } else {
        outputResult = {
          plan,
          oneriler: result?.oneriler ?? [],
          dosyalar: result?.dosyalar,
          kabul_kriterleri: result?.kabul_kriterleri,
          provider,
        }
        outputType = "text"
      }
    } catch (e) {
      status = "failed"
      outputResult = { error: String(e), provider }
    }
  } else {
    status = "needs_review"
    outputResult = { note: "Manuel inceleme gerekli", provider }
  }

  await supabase.from("celf_tasks").update({
    status,
    output_result: outputResult,
    output_type: outputType,
    token_cost: tokenCost,
    completed_at: status === "completed" || status === "needs_review" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", taskId)

  console.log(`[CELF Auto-Execute] ${directorate} (${provider}): ${status}, cost: $${tokenCost}`)
  return { status }
}
