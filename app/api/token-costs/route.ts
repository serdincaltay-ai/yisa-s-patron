/**
 * GET /api/token-costs — AI provider bazlı token maliyet özeti
 * token_costs tablosundan member_id'ye göre aggregate
 */
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

const MEMBER_LABELS: Record<string, { name: string; color: string }> = {
  claude: { name: "Claude", color: "#818cf8" },
  gpt: { name: "GPT", color: "#10b981" },
  openai: { name: "OpenAI", color: "#10b981" },
  gemini: { name: "Gemini", color: "#3b82f6" },
  google: { name: "Google", color: "#3b82f6" },
  together: { name: "Together", color: "#06b6d4" },
  fal: { name: "Fal AI", color: "#ec4899" },
  cursor: { name: "Cursor", color: "#f59e0b" },
  maychat: { name: "MayChat", color: "#a855f7" },
  manychat: { name: "ManyChat", color: "#a855f7" },
}

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { data: rows } = await supabase
      .from("token_costs")
      .select("member_id, cost_usd, input_tokens, output_tokens, created_at")

    const byMember: Record<string, { cost: number; tokens: number; lastUsed: string | null }> = {}

    for (const r of rows ?? []) {
      const mid = (r.member_id ?? "other").toLowerCase()
      if (!byMember[mid]) byMember[mid] = { cost: 0, tokens: 0, lastUsed: null }
      byMember[mid].cost += Number(r.cost_usd) || 0
      byMember[mid].tokens += (Number(r.input_tokens) || 0) + (Number(r.output_tokens) || 0)
      const createdAt = r.created_at ?? null
      if (createdAt && (!byMember[mid].lastUsed || createdAt > byMember[mid].lastUsed!)) {
        byMember[mid].lastUsed = createdAt
      }
    }

    const providers = Object.entries(byMember).map(([memberId, data]) => {
      const meta = MEMBER_LABELS[memberId] ?? { name: memberId, color: "#8892a8" }
      return {
        memberId,
        name: meta.name,
        color: meta.color,
        cost: Math.round(data.cost * 1000) / 1000,
        tokens: data.tokens,
        lastUsed: data.lastUsed,
      }
    })

    const totalCost = providers.reduce((s, p) => s + p.cost, 0)

    return NextResponse.json({
      providers: providers.sort((a, b) => b.cost - a.cost),
      totalCost: Math.round(totalCost * 1000) / 1000,
    })
  } catch (e) {
    console.error("token-costs API error:", e)
    return NextResponse.json(
      { providers: [], totalCost: 0 },
      { status: 500 }
    )
  }
}
