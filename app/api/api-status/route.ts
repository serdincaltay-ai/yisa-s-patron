import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

// API tipleri
type ApiType = "AI" | "Platform" | "DB"
type ApiStatus = "aktif" | "hata" | "pasif" | "key_yok"

interface ApiHealthResult {
  id: string
  name: string
  type: ApiType
  color: string
  status: ApiStatus
  hasKey: boolean
  keyPrefix: string
  model: string
  lastPing: string | null
  pingMs: number | null
  errorCount: number
  lastError: string | null
  monthlyBudget: number
  estimatedUsed: number
  costPer1kInput: number
  costPer1kOutput: number
  costPerImage?: number
}

// Lightweight health check — her API'ye basit bir istek atarak durumu kontrol eder
async function checkApiHealth(
  checkFn: () => Promise<{ ok: boolean; ms: number; error?: string }>
): Promise<{ status: ApiStatus; pingMs: number | null; lastPing: string; lastError: string | null }> {
  try {
    const result = await checkFn()
    return {
      status: result.ok ? "aktif" : "hata",
      pingMs: result.ms,
      lastPing: new Date().toISOString(),
      lastError: result.error || null,
    }
  } catch (e) {
    return {
      status: "hata",
      pingMs: null,
      lastPing: new Date().toISOString(),
      lastError: e instanceof Error ? e.message : String(e),
    }
  }
}

// Timed fetch helper
async function timedFetch(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; ms: number; status?: number; error?: string }> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    const ms = Date.now() - start
    // 401/403 means the endpoint is reachable — key format is valid
    if (res.ok || res.status === 401 || res.status === 403) {
      return { ok: true, ms, status: res.status }
    }
    return { ok: false, ms, status: res.status, error: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : "Baglanti hatasi" }
  }
}

export async function GET() {
  const patronOk = await requirePatron()
  if (!patronOk) {
    return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })
  }

  const now = new Date().toISOString()

  // API tanimlari
  const apiDefs: Array<{
    id: string; name: string; type: ApiType; color: string
    envKeys: string[]; model: string
    monthlyBudget: number; estimatedUsed: number
    costPer1kInput: number; costPer1kOutput: number; costPerImage?: number
    healthCheck: (() => Promise<{ ok: boolean; ms: number; error?: string }>) | null
  }> = [
    {
      id: "openai", name: "OpenAI (GPT)", type: "AI", color: "#10b981",
      envKeys: ["OPENAI_API_KEY"], model: "gpt-4o",
      monthlyBudget: 50, estimatedUsed: 12.40,
      costPer1kInput: 0.0025, costPer1kOutput: 0.01,
      healthCheck: process.env.OPENAI_API_KEY
        ? () => timedFetch("https://api.openai.com/v1/models", {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          })
        : null,
    },
    {
      id: "anthropic", name: "Anthropic (Claude)", type: "AI", color: "#818cf8",
      envKeys: ["ANTHROPIC_API_KEY"], model: "claude-sonnet-4",
      monthlyBudget: 50, estimatedUsed: 8.75,
      costPer1kInput: 0.003, costPer1kOutput: 0.015,
      healthCheck: process.env.ANTHROPIC_API_KEY
        ? () => timedFetch("https://api.anthropic.com/v1/models", {
            headers: {
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
          })
        : null,
    },
    {
      id: "google", name: "Google (Gemini)", type: "AI", color: "#3b82f6",
      envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
      model: "gemini-2.0-flash",
      monthlyBudget: 20, estimatedUsed: 1.20,
      costPer1kInput: 0.0001, costPer1kOutput: 0.0004,
      healthCheck: (() => {
        const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        return key
          ? () => timedFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
          : null
      })(),
    },
    {
      id: "together", name: "Together AI", type: "AI", color: "#06b6d4",
      envKeys: ["TOGETHER_API_KEY", "TOGETHER_AI_API_KEY"], model: "batch-islem",
      monthlyBudget: 15, estimatedUsed: 2.30,
      costPer1kInput: 0.0002, costPer1kOutput: 0.0006,
      healthCheck: (() => {
        const key = process.env.TOGETHER_API_KEY || process.env.TOGETHER_AI_API_KEY
        return key
          ? () => timedFetch("https://api.together.xyz/v1/models", {
              headers: { Authorization: `Bearer ${key}` },
            })
          : null
      })(),
    },
    {
      id: "fal", name: "Fal AI (Gorsel)", type: "AI", color: "#ec4899",
      envKeys: ["FAL_API_KEY", "FAL_KEY"], model: "gorsel-uretim",
      monthlyBudget: 25, estimatedUsed: 5.60,
      costPer1kInput: 0, costPer1kOutput: 0, costPerImage: 0.04,
      healthCheck: (() => {
        const key = process.env.FAL_API_KEY || process.env.FAL_KEY
        return key
          ? () => timedFetch("https://queue.fal.run/fal-ai/fast-sdxl", {
              method: "OPTIONS",
              headers: { Authorization: `Key ${key}` },
            })
          : null
      })(),
    },
    {
      id: "cursor", name: "Cursor AI", type: "AI", color: "#f59e0b",
      envKeys: ["CURSOR_API_KEY"], model: "kod-uretim",
      monthlyBudget: 20, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: null, // Cursor has no public health endpoint
    },
    {
      id: "v0", name: "V0 (Vercel AI)", type: "AI", color: "#a78bfa",
      envKeys: ["V0_API_KEY"], model: "tasarim-ui",
      monthlyBudget: 10, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: null, // V0 has no public health endpoint
    },
    {
      id: "supabase", name: "Supabase", type: "DB", color: "#3ecf8e",
      envKeys: ["NEXT_PUBLIC_SUPABASE_URL"], model: "veritabani",
      monthlyBudget: 25, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? () => timedFetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
            },
          })
        : null,
    },
    {
      id: "vercel", name: "Vercel", type: "Platform", color: "#ffffff",
      envKeys: [], model: "hosting",
      monthlyBudget: 20, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: () => timedFetch("https://api.vercel.com/v2/user", {
        headers: process.env.VERCEL_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}` }
          : {},
      }),
    },
    {
      id: "github", name: "GitHub", type: "Platform", color: "#8b949e",
      envKeys: ["GITHUB_TOKEN"], model: "repo",
      monthlyBudget: 0, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: process.env.GITHUB_TOKEN
        ? () => timedFetch("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
          })
        : null,
    },
    {
      id: "stripe", name: "Stripe", type: "Platform", color: "#635bff",
      envKeys: ["STRIPE_SECRET_KEY"], model: "odeme",
      monthlyBudget: 0, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: process.env.STRIPE_SECRET_KEY
        ? () => timedFetch("https://api.stripe.com/v1/balance", {
            headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
          })
        : null,
    },
    {
      id: "manychat", name: "ManyChat", type: "Platform", color: "#0084ff",
      envKeys: ["MANYCHAT_API_KEY"], model: "iletisim",
      monthlyBudget: 15, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: process.env.MANYCHAT_API_KEY
        ? () => timedFetch("https://api.manychat.com/fb/page/getInfo", {
            headers: { Authorization: `Bearer ${process.env.MANYCHAT_API_KEY}` },
          })
        : null,
    },
    {
      id: "vercel_blob", name: "Vercel Blob", type: "Platform", color: "#e2e8f0",
      envKeys: ["BLOB_READ_WRITE_TOKEN"], model: "depolama",
      monthlyBudget: 5, estimatedUsed: 0,
      costPer1kInput: 0, costPer1kOutput: 0,
      healthCheck: null, // No public health endpoint for Vercel Blob
    },
  ]

  // Paralel health check
  const healthResults = await Promise.allSettled(
    apiDefs.map(async (api) => {
      const hasKey = api.envKeys.length === 0
        ? api.id === "vercel"
        : api.envKeys.some((k) => !!process.env[k])

      const keyEnv = api.envKeys.find((k) => process.env[k])
      const keyPrefix = keyEnv
        ? (process.env[keyEnv]?.slice(0, 8) + "...")
        : (hasKey ? "bagli" : "")

      if (!hasKey && api.envKeys.length > 0) {
        return {
          id: api.id, name: api.name, type: api.type, color: api.color,
          status: "key_yok" as ApiStatus, hasKey: false, keyPrefix: "",
          model: api.model, lastPing: null, pingMs: null,
          errorCount: 0, lastError: null,
          monthlyBudget: api.monthlyBudget, estimatedUsed: api.estimatedUsed,
          costPer1kInput: api.costPer1kInput, costPer1kOutput: api.costPer1kOutput,
          ...(api.costPerImage !== undefined ? { costPerImage: api.costPerImage } : {}),
        } satisfies ApiHealthResult
      }

      if (api.healthCheck) {
        const health = await checkApiHealth(api.healthCheck)
        return {
          id: api.id, name: api.name, type: api.type, color: api.color,
          status: health.status, hasKey, keyPrefix,
          model: api.model, lastPing: health.lastPing, pingMs: health.pingMs,
          errorCount: health.status === "hata" ? 1 : 0, lastError: health.lastError,
          monthlyBudget: api.monthlyBudget, estimatedUsed: api.estimatedUsed,
          costPer1kInput: api.costPer1kInput, costPer1kOutput: api.costPer1kOutput,
          ...(api.costPerImage !== undefined ? { costPerImage: api.costPerImage } : {}),
        } satisfies ApiHealthResult
      }

      // No health check endpoint but key exists
      return {
        id: api.id, name: api.name, type: api.type, color: api.color,
        status: (hasKey ? "aktif" : "pasif") as ApiStatus, hasKey, keyPrefix,
        model: api.model, lastPing: now, pingMs: null,
        errorCount: 0, lastError: null,
        monthlyBudget: api.monthlyBudget, estimatedUsed: api.estimatedUsed,
        costPer1kInput: api.costPer1kInput, costPer1kOutput: api.costPer1kOutput,
        ...(api.costPerImage !== undefined ? { costPerImage: api.costPerImage } : {}),
      } satisfies ApiHealthResult
    })
  )

  const apis: ApiHealthResult[] = healthResults.map((r, i) => {
    if (r.status === "fulfilled") return r.value
    return {
      id: apiDefs[i].id, name: apiDefs[i].name, type: apiDefs[i].type,
      color: apiDefs[i].color, status: "hata" as ApiStatus,
      hasKey: false, keyPrefix: "", model: apiDefs[i].model,
      lastPing: now, pingMs: null, errorCount: 1,
      lastError: r.reason instanceof Error ? r.reason.message : String(r.reason),
      monthlyBudget: apiDefs[i].monthlyBudget, estimatedUsed: apiDefs[i].estimatedUsed,
      costPer1kInput: apiDefs[i].costPer1kInput, costPer1kOutput: apiDefs[i].costPer1kOutput,
    }
  })

  const totalBudget = apis.reduce((s, a) => s + a.monthlyBudget, 0)
  const totalUsed = apis.reduce((s, a) => s + a.estimatedUsed, 0)
  const activeCount = apis.filter((a) => a.status === "aktif").length
  const errorCount = apis.filter((a) => a.status === "hata").length

  return NextResponse.json({
    apis,
    summary: {
      totalBudget,
      totalUsed,
      remaining: totalBudget - totalUsed,
      activeCount,
      errorCount,
      pasifCount: apis.filter((a) => a.status === "pasif" || a.status === "key_yok").length,
      totalCount: apis.length,
      lastCheck: now,
    },
  })
}
