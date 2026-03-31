import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * Her AI ajan icin birim fiyat (USD / 1K token).
 * Input ve output icin ayri fiyatlandirma.
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  claude: { input: 0.003, output: 0.015 },
  gpt: { input: 0.005, output: 0.015 },
  gemini: { input: 0.00035, output: 0.0014 },
  together: { input: 0.0002, output: 0.0002 },
  cursor: { input: 0.005, output: 0.015 },
  fal: { input: 0.001, output: 0.001 },
  v0: { input: 0.003, output: 0.003 },
}

const AGENT_META: Record<string, { name: string; color: string }> = {
  claude: { name: "Claude", color: "#818cf8" },
  gpt: { name: "GPT", color: "#10b981" },
  gemini: { name: "Gemini", color: "#3b82f6" },
  together: { name: "Together", color: "#06b6d4" },
  cursor: { name: "Cursor", color: "#f59e0b" },
  fal: { name: "Fal AI", color: "#ec4899" },
  manychat: { name: "ManyChat", color: "#a855f7" },
  v0: { name: "V0", color: "#ffffff" },
}

type AgentStats = {
  memberId: string
  name: string
  color: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  thisMonthTokens: number
  thisMonthCost: number
  lastUsed: string | null
  prevMonthCost: number
}

/**
 * GET /api/kasa/token-costs — Ajan bazli token harcamasi ve maliyet detaylari.
 * Her AI ajan icin: bu ay kullanilan token, tahmini maliyet ($), son kullanim, trend.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { data: rows, error: queryError } = await supabase
      .from("token_costs")
      .select("member_id, model, input_tokens, output_tokens, cost_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(10000)

    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const prevMonth = prevDate.toISOString().slice(0, 7)

    const agentMap: Record<string, AgentStats> = {}

    // Her bilinen ajan icin bos kayit olustur
    for (const [mid, meta] of Object.entries(AGENT_META)) {
      agentMap[mid] = {
        memberId: mid,
        name: meta.name,
        color: meta.color,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        thisMonthTokens: 0,
        thisMonthCost: 0,
        lastUsed: null,
        prevMonthCost: 0,
      }
    }

    // Sorgu hatasi olsa bile paneli bos gostermemek icin sifir verilerle devam et.
    for (const r of queryError ? [] : (rows ?? [])) {
      const mid = (r.member_id ?? "other").toLowerCase()
      if (!agentMap[mid]) {
        const meta = AGENT_META[mid] ?? { name: mid, color: "#8892a8" }
        agentMap[mid] = {
          memberId: mid,
          name: meta.name,
          color: meta.color,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          thisMonthTokens: 0,
          thisMonthCost: 0,
          lastUsed: null,
          prevMonthCost: 0,
        }
      }

      const agent = agentMap[mid]
      const inputT = Number(r.input_tokens) || 0
      const outputT = Number(r.output_tokens) || 0
      const cost = Number(r.cost_usd) || 0
      const createdAt = r.created_at ?? ""
      const month = createdAt.slice(0, 7)

      agent.inputTokens += inputT
      agent.outputTokens += outputT
      agent.totalTokens += inputT + outputT
      agent.costUsd += cost

      if (month === thisMonth) {
        agent.thisMonthTokens += inputT + outputT
        agent.thisMonthCost += cost
      }
      if (month === prevMonth) {
        agent.prevMonthCost += cost
      }

      if (createdAt && (!agent.lastUsed || createdAt > agent.lastUsed)) {
        agent.lastUsed = createdAt
      }
    }

    // Sonuclari dizi olarak dondur, maliyet sirasina gore
    const agents = Object.values(agentMap)
      .map((a) => ({
        ...a,
        costUsd: Math.round(a.costUsd * 10000) / 10000,
        thisMonthCost: Math.round(a.thisMonthCost * 10000) / 10000,
        prevMonthCost: Math.round(a.prevMonthCost * 10000) / 10000,
        trend: a.prevMonthCost > 0
          ? Math.round(((a.thisMonthCost - a.prevMonthCost) / a.prevMonthCost) * 100)
          : a.thisMonthCost > 0 ? 100 : 0,
      }))
      .sort((a, b) => b.costUsd - a.costUsd)

    const totalCost = agents.reduce((s, a) => s + a.costUsd, 0)
    const thisMonthTotal = agents.reduce((s, a) => s + a.thisMonthCost, 0)

    return NextResponse.json({
      agents,
      totalCost: Math.round(totalCost * 10000) / 10000,
      thisMonthTotal: Math.round(thisMonthTotal * 10000) / 10000,
      pricing: MODEL_PRICING,
      error: queryError?.message ?? null,
    })
  } catch (e) {
    console.error("kasa/token-costs API error:", e)
    return NextResponse.json({ agents: [], totalCost: 0, thisMonthTotal: 0, pricing: MODEL_PRICING }, { status: 500 })
  }
}
