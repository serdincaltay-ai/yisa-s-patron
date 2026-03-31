/**
 * POST /api/mutfak/ask
 * Mutfak Panel — Patron mesajini secilen robota gonderir.
 * Body: { message: string, robot: "gemini"|"claude"|"gpt"|"cursor"|"v0"|"fal", history?: {role:string,content:string}[] }
 * Response: { reply: string, provider: string, cost: number }
 */

import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import { callClaude, callGPT, callGemini, callCursor, callFalAI } from "@/lib/ai-providers"
import { createAdminClient } from "@/lib/supabase/admin"

const VALID_ROBOTS = ["gemini", "claude", "gpt", "cursor", "v0", "fal"] as const
type Robot = (typeof VALID_ROBOTS)[number]

const COST_MAP: Record<Robot, number> = {
  gemini: 0.0001,
  claude: 0.003,
  gpt: 0.0025,
  cursor: 0.01,
  v0: 0.02,
  fal: 0.04,
}

const SYSTEM_PROMPT = `Sen YiSA-S Mutfak Paneli asistanisin. Patron seninle sohbet ediyor.
Gecmis mesaj baglamini dikkate al. Kisa, net ve Turkce yanit ver.
Spor tesisi yonetimi, CELF motoru, direktorlukler hakkinda bilgi verebilirsin.
Uydurma bilgi yazma; sadece YiSA-S bagliminda uret.
Yanitini SADECE su JSON formatinda ver: {"plan":"yanit metni","oneriler":["oneri1","oneri2"]}`

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) {
    return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const robot: Robot = VALID_ROBOTS.includes(body.robot) ? body.robot : "gemini"
    const history: { role: string; content: string }[] = Array.isArray(body.history)
      ? body.history.slice(-20)
      : []

    if (!message) {
      return NextResponse.json({ error: "Mesaj bos olamaz." }, { status: 400 })
    }

    const historyContext = history
      .map((h) => `${h.role === "patron" ? "Patron" : "Asistan"}: ${h.content}`)
      .join("\n")

    const fullPrompt = historyContext
      ? `Onceki sohbet:\n${historyContext}\n\nPatron: ${message}`
      : message

    let reply = ""
    let cost = COST_MAP[robot]
    let actualProvider: string = robot

    if (robot === "gemini") {
      const result = await callGemini(fullPrompt, SYSTEM_PROMPT)
      reply = result.plan
    } else if (robot === "claude") {
      const result = await callClaude(fullPrompt, SYSTEM_PROMPT)
      reply = result.plan
    } else if (robot === "gpt") {
      const result = await callGPT(fullPrompt, SYSTEM_PROMPT)
      reply = result.plan
    } else if (robot === "cursor") {
      const result = await callCursor(fullPrompt, SYSTEM_PROMPT)
      reply = result.plan
    } else if (robot === "v0") {
      // V0 is design-focused, use GPT as conversational fallback
      const result = await callGPT(fullPrompt, SYSTEM_PROMPT)
      reply = result.plan
      cost = COST_MAP.gpt
      actualProvider = "v0-fallback-gpt"
    } else if (robot === "fal") {
      // Fal is image-focused — if message asks for image, generate; otherwise use Gemini
      const lower = message.toLowerCase()
      if (lower.includes("gorsel") || lower.includes("resim") || lower.includes("image") || lower.includes("logo")) {
        const result = await callFalAI(message)
        reply = result.gorsel_url
          ? `Gorsel uretildi: ${result.gorsel_url}`
          : result.plan
      } else {
        const result = await callGemini(fullPrompt, SYSTEM_PROMPT)
        reply = result.plan
        cost = COST_MAP.gemini
        actualProvider = "fal-fallback-gemini"
      }
    }

    if (!reply || reply === "STUB (API key yok)") {
      reply = "Yanit uretilemedi. API anahtari eksik olabilir."
    }

    // Save conversation to DB (best effort)
    try {
      const supabase = createAdminClient()
      await supabase.from("celf_epics").insert({
        title: `Mutfak: ${message.slice(0, 60)}`,
        raw_command: message,
        patron_command: message,
        status: "done",
      })
    } catch (dbErr) {
      console.error("[mutfak/ask] DB persist error:", dbErr)
    }

    return NextResponse.json({ reply, provider: actualProvider, cost })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    console.error("[mutfak/ask] Error:", err)
    return NextResponse.json({ error: "Sohbet hatasi", detail: err }, { status: 500 })
  }
}
