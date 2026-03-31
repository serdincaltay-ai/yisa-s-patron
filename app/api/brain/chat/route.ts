/**
 * POST /api/brain/chat
 * Beyin Takımı sohbet endpoint'i — Patron ile çok turlu sohbet.
 * Body: { message: string, history: { role: string, content: string }[], mode: 'chat' | 'command' }
 * Response: { reply: string, suggestions?: string[], provider: string, task_id?: string, template_id?: string }
 *
 * BUG FIX #1: Her sohbet etkileşimi celf_tasks tablosuna kaydedilir (görev kayıt sistemi)
 * BUG FIX #2: Şablon içerikli yanıtlar ceo_templates tablosuna kaydedilir (şablon persistence)
 */

import { generateText } from "ai"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

const BRAIN_SYSTEM_PROMPT = `Sen YİSA-S Beyin Takımı asistanısın. Patron seninle sohbet ediyor.
Geçmiş mesaj bağlamını dikkate al. Kısa, net ve Türkçe yanıt ver.
Uydurma firma/isim yazma; sadece YİSA-S bağlamında üret.
Eğer Patron bir iş komutu vermek istiyorsa, ona "komut:" ön ekini kullanmasını öner.`

/** Şablon anahtar kelimeleri — yanıtta bunlar varsa şablon olarak kaydet */
const TEMPLATE_KEYWORDS = [
  "şablon", "template", "form oluştur", "rapor şablonu", "kayıt formu", "başvuru formu",
  "sözleşme", "plan şablonu", "değerlendirme formu", "kontrol listesi",
  "checklist", "taslak", "draft",
]

/** Direktörlük tespiti için anahtar kelimeler */
const CHAT_DIRECTORATE_KEYWORDS: Record<string, string[]> = {
  CTO: ["kod", "api", "teknik", "sistem", "veritabanı", "migration", "build", "deploy"],
  CFO: ["maliyet", "fiyat", "bütçe", "gelir", "gider", "muhasebe", "finans"],
  CMO: ["pazarlama", "kampanya", "reklam", "sosyal medya", "instagram", "içerik"],
  CSPO: ["spor", "branş", "antrenman", "sporcu", "beceri", "ölçüm"],
  CPO: ["tasarım", "ui", "arayüz", "ekran", "design", "panel"],
  CDO: ["veri", "analiz", "rapor", "istatistik", "data", "grafik"],
  CHRO: ["personel", "ik", "antrenör", "kadro", "çalışan", "maaş"],
  CLO: ["hukuk", "sözleşme", "kvkk", "yasal", "mevzuat"],
  CSO: ["strateji", "satış", "demo", "franchise", "müşteri"],
  CISO: ["güvenlik", "şifre", "yetki", "rol", "izin", "audit"],
  CCO: ["destek", "bildirim", "iletişim", "mesaj", "veli", "operasyon", "tesis", "ders programı", "yoklama", "envanter"],
  CRDO: ["araştırma", "rakip", "benchmark", "trend", "yenilik", "ar-ge"],
}

function detectDirectorate(text: string): string {
  const lower = text.toLowerCase()
  for (const [dir, keywords] of Object.entries(CHAT_DIRECTORATE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return dir
  }
  return "CDO"
}

function isTemplateContent(message: string, reply: string): boolean {
  const combined = (message + " " + reply).toLowerCase()
  return TEMPLATE_KEYWORDS.some((kw) => combined.includes(kw))
}

function detectTemplateType(message: string, reply: string): string {
  const combined = (message + " " + reply).toLowerCase()
  if (combined.includes("rapor") || combined.includes("analiz")) return "rapor"
  if (combined.includes("ui") || combined.includes("tasarım") || combined.includes("arayüz")) return "ui"
  if (combined.includes("dashboard") || combined.includes("panel")) return "dashboard"
  if (combined.includes("bildirim") || combined.includes("notification")) return "bildirim"
  if (combined.includes("email") || combined.includes("e-posta")) return "email"
  return "rapor"
}

export async function POST(request: Request) {
  try {
    // Patron oturumu kontrolü
    const cookieStore = await cookies()
    const patronSession =
      cookieStore.get("patron_session")?.value === "authenticated"
    if (!patronSession) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const mode = body.mode === "command" ? "command" : "chat"
    const history: { role: string; content: string }[] = Array.isArray(
      body.history
    )
      ? body.history.slice(-20)
      : []

    if (!message) {
      return NextResponse.json(
        { error: "Mesaj boş olamaz." },
        { status: 400 }
      )
    }

    // Komut modu → CELF pipeline'a yönlendir
    if (mode === "command") {
      return NextResponse.json({
        reply:
          "Bu komut CELF pipeline üzerinden işlenecek. Lütfen ASK ekranındaki komut modunu kullanın.",
        action: "redirect_celf",
        suggestions: ["komut: " + message],
      })
    }

    // Sohbet modu → geçmiş bağlamıyla AI yanıtı üret
    const historyContext = history
      .map(
        (h) =>
          `${h.role === "patron" ? "Patron" : h.role === "system" ? "Sistem" : "Beyin Takımı"}: ${h.content}`
      )
      .join("\n")

    const fullPrompt = historyContext
      ? `Önceki sohbet:\n${historyContext}\n\nPatron: ${message}`
      : message

    const result = await generateText({
      model: "google/gemini-2.0-flash" as unknown as Parameters<typeof generateText>[0]["model"],
      system: BRAIN_SYSTEM_PROMPT,
      messages: [{ role: "user", content: fullPrompt }],
      maxOutputTokens: 400,
    })

    const reply = result.text || "Yanıt oluşturulamadı."
    const suggestions = generateSuggestions(message)

    // ── BUG FIX #1 & #2: Görev kayıt + Şablon persistence ──
    let taskId: string | undefined
    let templateId: string | undefined

    try {
      const supabase = createAdminClient()
      const directorate = detectDirectorate(message)
      const templateDetected = isTemplateContent(message, reply)
      const outputType = templateDetected ? "template" : "text"

      // Epic oluştur (sohbet oturumu kaydı)
      const { data: epic } = await supabase
        .from("celf_epics")
        .insert({
          title: message.slice(0, 80),
          raw_command: message,
          patron_command: message,
          status: "done",
        })
        .select("id")
        .single()

      if (epic) {
        // Task kaydı oluştur — dashboard'da görev olarak görünür
        const { data: task } = await supabase
          .from("celf_tasks")
          .insert({
            epic_id: epic.id,
            directorate,
            ai_provider: "gemini",
            task_description: message.slice(0, 200),
            status: "completed",
            output_type: outputType,
            output_result: { plan: reply, oneriler: suggestions },
            token_cost: 0.0008,
            completed_at: new Date().toISOString(),
          })
          .select("id")
          .single()

        if (task) {
          taskId = task.id
          await supabase
            .from("celf_epics")
            .update({
              parsed_directorates: [directorate],
              total_tasks: 1,
              completed_tasks: 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", epic.id)
        }

        // Şablon tespit edildiyse ceo_templates'e kaydet
        if (templateDetected) {
          const templateType = detectTemplateType(message, reply)
          const { data: tpl } = await supabase
            .from("ceo_templates")
            .insert({
              template_name: message.slice(0, 100),
              template_type: templateType,
              director_key: directorate,
              content: { plan: reply, source: "brain-chat" },
              variables: [],
              data_sources: [],
              is_approved: false,
              approved_by: null,
            })
            .select("id")
            .single()
          if (tpl) templateId = tpl.id
        }
      }
    } catch (dbErr) {
      // DB kayıt hatası sohbet yanıtını engellemez
      console.error("[brain/chat] DB persist error:", dbErr)
    }

    return NextResponse.json({
      reply,
      suggestions,
      provider: "gemini",
      task_id: taskId,
      template_id: templateId,
    })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    console.error("[brain/chat] Error:", err)
    return NextResponse.json(
      { error: "Sohbet hatası", detail: err },
      { status: 500 }
    )
  }
}

/** Mesaja göre basit öneri üretimi */
function generateSuggestions(message: string): string[] {
  const suggestions: string[] = []
  const lower = message.toLowerCase()

  if (lower.includes("rapor") || lower.includes("analiz")) {
    suggestions.push("komut: Bu raporu oluştur")
    suggestions.push("Daha detaylı açıkla")
  } else if (lower.includes("sporcu") || lower.includes("kayıt")) {
    suggestions.push("komut: Sporcu kayıt formu oluştur")
    suggestions.push("Mevcut kayıt durumunu göster")
  } else if (
    lower.includes("gelir") ||
    lower.includes("gider") ||
    lower.includes("finans")
  ) {
    suggestions.push("komut: Gelir-gider raporu hazırla")
    suggestions.push("Mali durumu özetle")
  }

  if (!suggestions.length) {
    suggestions.push("Devam et")
    suggestions.push("Bunu komut olarak gönder")
  }

  return suggestions.slice(0, 3)
}
