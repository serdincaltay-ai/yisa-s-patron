/**
 * YİSA-S AI ve Aksiyon Provider'ları
 * Key yoksa stub, hata throw etme.
 */

const TIMEOUT_MS = 60_000
const JSON_INSTRUCTION =
  "Yanıtını SADECE şu JSON formatında ver: {plan, oneriler, dosyalar, kabul_kriterleri}"

export type CelfOutput = {
  plan: string
  oneriler: string[]
  dosyalar?: { path: string; aciklama: string }[]
  kabul_kriterleri?: string[]
  gorsel_url?: string
}

function safeFetch(
  url: string,
  opts: RequestInit & { timeout?: number }
): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeout ?? TIMEOUT_MS)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t))
}

function parseCelfOutput(raw: string): CelfOutput {
  try {
    const parsed = JSON.parse(raw)
    const plan = typeof parsed?.plan === "string" ? parsed.plan : raw.slice(0, 500)
    const oneriler = Array.isArray(parsed?.oneriler)
      ? parsed.oneriler.map(String)
      : ["JSON parse edilemedi"]
    return {
      plan,
      oneriler,
      dosyalar: Array.isArray(parsed?.dosyalar) ? parsed.dosyalar : undefined,
      kabul_kriterleri: Array.isArray(parsed?.kabul_kriterleri) ? parsed.kabul_kriterleri : undefined,
      gorsel_url: typeof parsed?.gorsel_url === "string" ? parsed.gorsel_url : undefined,
    }
  } catch {
    return { plan: raw.slice(0, 500), oneriler: ["JSON parse edilemedi"] }
  }
}

function extractTextFromResponse(data: unknown): string {
  if (typeof data === "string") return data
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.choices) && obj.choices[0]) {
      const msg = (obj.choices[0] as Record<string, unknown>).message
      if (msg && typeof msg === "object" && Array.isArray((msg as Record<string, unknown>).content)) {
        const content = (msg as Record<string, unknown>).content as Array<{ type?: string; text?: string }>
        const text = content.find((c) => c?.type === "text")?.text ?? content[0]?.text
        return text ?? JSON.stringify(data)
      }
    }
    if (Array.isArray(obj.content)) {
      const part = obj.content.find((p: { type?: string }) => p?.type === "text") as { text?: string } | undefined
      return part?.text ?? JSON.stringify(data)
    }
    if (typeof obj.text === "string") return obj.text
  }
  return JSON.stringify(data)
}

/** Claude — Anthropic Messages API */
export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<CelfOutput> {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
  if (!key?.trim()) return { plan: "STUB (API key yok)", oneriler: ["Key bulunamadı"] }
  try {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }
    if (systemPrompt) body.system = systemPrompt
    const res = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      timeout: TIMEOUT_MS,
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const err = (data as { error?: { message?: string } }).error?.message ?? res.statusText
      return { plan: "Hata", oneriler: [err] }
    }
    const content = (data as { content?: Array<{ type?: string; text?: string }> }).content
    const textPart = Array.isArray(content) ? content.find((c) => c?.type === "text") : undefined
    const text = textPart?.text ?? ""
    return parseCelfOutput(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { plan: "Hata", oneriler: [msg] }
  }
}

/** GPT — OpenAI Chat API */
export async function callGPT(
  prompt: string,
  systemPrompt?: string
): Promise<CelfOutput> {
  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) return { plan: "STUB (API key yok)", oneriler: ["Key bulunamadı"] }
  try {
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
    messages.push({ role: "user", content: prompt })
    const res = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 2048,
        messages,
      }),
      timeout: TIMEOUT_MS,
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const err = (data as { error?: { message?: string } }).error?.message ?? res.statusText
      return { plan: "Hata", oneriler: [err] }
    }
    const text = extractTextFromResponse(data)
    return parseCelfOutput(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { plan: "Hata", oneriler: [msg] }
  }
}

/** Cursor — CURSOR_API_KEY yoksa veya hata olursa GPT fallback */
export async function callCursor(
  prompt: string,
  systemPrompt?: string
): Promise<CelfOutput> {
  const key = process.env.CURSOR_API_KEY
  if (!key?.trim()) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("CURSOR_API_KEY yok, GPT fallback")
    }
    return callGPT(prompt, systemPrompt)
  }
  try {
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
    messages.push({ role: "user", content: prompt })
    const res = await safeFetch("https://api.cursor.sh/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "cursor-large",
        messages,
        max_tokens: 4096,
      }),
      timeout: TIMEOUT_MS,
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      return callGPT(prompt, systemPrompt)
    }
    const text = extractTextFromResponse(data)
    return parseCelfOutput(text)
  } catch {
    return callGPT(prompt, systemPrompt)
  }
}

/** v0 — Vercel v0.dev UI üretimi (V0_API_KEY) */
export async function callV0(
  prompt: string
): Promise<{ success: boolean; url?: string; code?: string }> {
  const key = process.env.V0_API_KEY
  if (!key?.trim()) return { success: false }
  try {
    const res = await safeFetch("https://api.v0.dev/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ prompt, framework: "nextjs" }),
      timeout: TIMEOUT_MS,
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) return { success: false }
    const url = typeof (data as { url?: string }).url === "string" ? (data as { url: string }).url : undefined
    const code = typeof (data as { code?: string }).code === "string" ? (data as { code: string }).code : undefined
    return { success: true, url, code }
  } catch {
    return { success: false }
  }
}

const GEMINI_DEFAULT_SYSTEM_PROMPT = `Sen YİSA-S spor tesisi yazılımının AI asistanısın.
YİSA-S: Spor okulu ve spor tesisi yönetim SaaS platformu (multi-tenant).
Sektör: SPOR TESİSİ YAZILIMI — futbol, basketbol, yüzme, tenis, cimnastik, jimnastik.
Roller: Patron (tesis sahibi), Antrenör, Sportif Direktör, Veli, Personel.
Özellikler: Tesis yönetimi, öğrenci takibi, ölçüm/değerlendirme, muhasebe, İK.
CELF motoru: AI orkestrasyon sistemi ile 12 direktörlük yönetimi.
ÖNEMLİ: "tarım sektörü" veya alakasız sektörlerden bahsetme.
Her yanıtını sadece spor tesisi yazılımı bağlamında ver. Türkçe yanıt ver.`

/** Gemini — Google Generative AI */
export async function callGemini(
  prompt: string,
  systemPrompt?: string
): Promise<CelfOutput> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key?.trim()) return { plan: "STUB (API key yok)", oneriler: ["Key bulunamadı"] }
  try {
    const effectiveSystemPrompt = systemPrompt || GEMINI_DEFAULT_SYSTEM_PROMPT
    const fullPrompt = `${effectiveSystemPrompt}\n\n${prompt}\n\n${JSON_INSTRUCTION}`
    const res = await safeFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 2048 },
        }),
        timeout: TIMEOUT_MS,
      }
    )
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const err = (data as { error?: { message?: string } }).error?.message ?? res.statusText
      return { plan: "Hata", oneriler: [err] }
    }
    const candidates = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>}).candidates
    const text = candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    return parseCelfOutput(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { plan: "Hata", oneriler: [msg] }
  }
}

/** Together AI */
export async function callTogether(
  prompt: string,
  systemPrompt?: string
): Promise<CelfOutput> {
  const key = process.env.TOGETHER_API_KEY || process.env.TOGETHER_AI_API_KEY
  if (!key?.trim()) return { plan: "STUB (API key yok)", oneriler: ["Key bulunamadı"] }
  try {
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt })
    messages.push({ role: "user", content: `${prompt}\n\n${JSON_INSTRUCTION}` })
    const res = await safeFetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        max_tokens: 2048,
        messages,
      }),
      timeout: TIMEOUT_MS,
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const err = (data as { error?: { message?: string } }).error?.message ?? res.statusText
      return { plan: "Hata", oneriler: [err] }
    }
    const text = extractTextFromResponse(data)
    return parseCelfOutput(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { plan: "Hata", oneriler: [msg] }
  }
}

/** Fal AI — Görsel üretim (flux/schnell text-to-image) */
export async function callFalAI(prompt: string): Promise<CelfOutput> {
  const key = process.env.FAL_API_KEY || process.env.FAL_KEY
  if (!key?.trim()) return { plan: "STUB (API key yok)", oneriler: ["Key bulunamadı"] }
  try {
    const res = await safeFetch("https://queue.fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${key}`,
      },
      body: JSON.stringify({ prompt }),
      timeout: TIMEOUT_MS,
    })
    const data = (await res.json()) as Record<string, unknown>
    if (!res.ok) {
      const err = (data as { detail?: string }).detail ?? res.statusText
      return { plan: "Hata", oneriler: [String(err)] }
    }
    const img = (data as { images?: Array<{ url?: string }> }).images?.[0]?.url ?? (data as { image?: { url?: string } }).image?.url
    return { plan: "Görsel üretildi", oneriler: [], gorsel_url: img ?? "" }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { plan: "Hata", oneriler: [msg] }
  }
}

// ——————— Aksiyon Provider'lar (opsiyonel, key yoksa skip) ———————

export async function callVercelDeploy(
  projectId: string,
  branch?: string
): Promise<{ url: string; status: string }> {
  const token = process.env.VERCEL_TOKEN
  if (!token?.trim()) return { url: "", status: "skipped (key yok)" }
  try {
    const res = await safeFetch(
      `https://api.vercel.com/v1/integrations/deploy/${projectId}${branch ? `?branch=${branch}` : ""}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 }
    )
    const data = (await res.json()) as Record<string, unknown>
    const url = (data as { url?: string }).url ?? ""
    return { url, status: res.ok ? "ok" : "failed" }
  } catch {
    return { url: "", status: "error" }
  }
}

export async function callGitHub(
  action: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; url?: string }> {
  const token = process.env.GITHUB_TOKEN
  if (!token?.trim()) return { success: false }
  try {
    if (action === "create_file") {
      const { owner, repo, path, content, message } = params
      const res = await safeFetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: btoa(String(content)), message: message || "Update" }),
          timeout: 30_000,
        }
      )
      const data = (await res.json()) as Record<string, unknown>
      const htmlUrl = (data as { content?: { html_url?: string } }).content?.html_url
      return { success: res.ok, url: typeof htmlUrl === "string" ? htmlUrl : undefined }
    }
    return { success: false }
  } catch {
    return { success: false }
  }
}

export async function callManyChat(
  action: string,
  params: Record<string, unknown>
): Promise<{ success: boolean }> {
  const key = process.env.MANYCHAT_API_KEY
  if (!key?.trim()) return { success: false }
  try {
    const res = await safeFetch("https://api.manychat.com/fb/subscriber/sendFlow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ ...params }),
      timeout: 15_000,
    })
    return { success: res.ok }
  } catch {
    return { success: false }
  }
}

export async function callRailway(
  action: string,
  params: Record<string, unknown>
): Promise<{ url: string; status: string }> {
  const token = process.env.RAILWAY_TOKEN
  if (!token?.trim()) return { url: "", status: "skipped (key yok)" }
  try {
    const res = await safeFetch("https://backboard.railway.app/graphql/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: "query { me { id } }", variables: params }),
      timeout: 30_000,
    })
    return { url: "", status: res.ok ? "ok" : "failed" }
  } catch {
    return { url: "", status: "error" }
  }
}
