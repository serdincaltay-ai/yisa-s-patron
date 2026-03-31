import { NextResponse } from "next/server"
import { callClaude, callGPT, callGemini, callTogether } from "@/lib/ai-providers"
import { requirePatron } from "@/lib/celf/patron-auth"

const PING = "Merhaba, test"

function isHealthyResponse(result: { plan?: string; oneriler?: string[] }): { ok: boolean; error?: string } {
  const plan = (result?.plan || "").toLowerCase()
  const firstHint = Array.isArray(result?.oneriler) ? String(result.oneriler[0] || "") : ""
  const hint = firstHint.toLowerCase()

  if (!plan && !hint) {
    return { ok: false, error: "Bos provider yaniti" }
  }
  if (
    plan === "hata" ||
    hint.includes("invalid") ||
    hint.includes("api key") ||
    hint.includes("unauthorized") ||
    hint.includes("forbidden")
  ) {
    return { ok: false, error: firstHint || "Provider hatasi" }
  }
  return { ok: true }
}

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const result: Record<string, { ok: boolean; ms: number; error?: string; response?: string }> = {}

  let start = Date.now()
  try {
    const r = await callClaude(PING)
    const health = isHealthyResponse(r)
    result.claude = {
      ok: health.ok,
      ms: Date.now() - start,
      ...(health.ok
        ? { response: JSON.stringify(r).slice(0, 100) }
        : { error: health.error || "Provider hatasi", response: JSON.stringify(r).slice(0, 100) }),
    }
  } catch (e: unknown) {
    result.claude = { ok: false, ms: Date.now() - start, error: (e as Error)?.message ?? String(e) }
  }

  start = Date.now()
  try {
    const r = await callGPT(PING)
    const health = isHealthyResponse(r)
    result.gpt = {
      ok: health.ok,
      ms: Date.now() - start,
      ...(health.ok
        ? { response: JSON.stringify(r).slice(0, 100) }
        : { error: health.error || "Provider hatasi", response: JSON.stringify(r).slice(0, 100) }),
    }
  } catch (e: unknown) {
    result.gpt = { ok: false, ms: Date.now() - start, error: (e as Error)?.message ?? String(e) }
  }

  start = Date.now()
  try {
    const r = await callGemini(PING)
    const health = isHealthyResponse(r)
    result.gemini = {
      ok: health.ok,
      ms: Date.now() - start,
      ...(health.ok
        ? { response: JSON.stringify(r).slice(0, 100) }
        : { error: health.error || "Provider hatasi", response: JSON.stringify(r).slice(0, 100) }),
    }
  } catch (e: unknown) {
    result.gemini = { ok: false, ms: Date.now() - start, error: (e as Error)?.message ?? String(e) }
  }

  start = Date.now()
  try {
    const r = await callTogether(PING)
    const health = isHealthyResponse(r)
    result.together = {
      ok: health.ok,
      ms: Date.now() - start,
      ...(health.ok
        ? { response: JSON.stringify(r).slice(0, 100) }
        : { error: health.error || "Provider hatasi", response: JSON.stringify(r).slice(0, 100) }),
    }
  } catch (e: unknown) {
    result.together = { ok: false, ms: Date.now() - start, error: (e as Error)?.message ?? String(e) }
  }

  const envCheck = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    TOGETHER_API_KEY: !!process.env.TOGETHER_API_KEY,
    TOGETHER_AI_API_KEY: !!process.env.TOGETHER_AI_API_KEY,
  }

  return NextResponse.json({ ...result, envCheck })
}
