"use client"

import { useMemo } from "react"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const API_ID_TO_MEMBER: Record<string, string> = {
  openai: "gpt",
  anthropic: "claude",
  google: "gemini",
  together: "together",
  fal: "fal",
  cursor: "cursor",
}

export default function TokenMaliyetWidget() {
  const { data: tokenData } = useSWR<{ providers: Array<{ memberId: string; name: string; color: string; cost: number; tokens: number; lastUsed: string | null }>; totalCost: number }>(
    "/api/token-costs",
    fetcher,
    { refreshInterval: 30000 }
  )
  const { data: apiData } = useSWR<{ apis: Array<{ id: string; name: string; color: string; estimatedUsed: number; status: string }>; summary: { totalUsed: number } }>(
    "/api/api-status",
    fetcher,
    { refreshInterval: 30000 }
  )

  const merged = useMemo(() => {
    const fromToken = tokenData?.providers ?? []
    const fromApi = apiData?.apis ?? []
    const map = new Map<string, { name: string; color: string; cost: number; tokens: number; lastUsed: string | null; status: string }>()

    for (const p of fromToken) {
      map.set(p.memberId, {
        name: p.name,
        color: p.color,
        cost: p.cost,
        tokens: p.tokens,
        lastUsed: p.lastUsed,
        status: "aktif",
      })
    }

    for (const a of fromApi) {
      const memberId = API_ID_TO_MEMBER[a.id] ?? a.id
      const existing = map.get(memberId)
      const cost = existing?.cost ?? a.estimatedUsed ?? 0
      if (!existing || cost > 0) {
        map.set(memberId, {
          name: a.name.replace(/\s*\([^)]+\)/, ""),
          color: a.color,
          cost: existing ? existing.cost : cost,
          tokens: existing?.tokens ?? 0,
          lastUsed: existing?.lastUsed ?? null,
          status: a.status ?? "aktif",
        })
      }
    }

    return Array.from(map.entries())
      .map(([memberId, v]) => ({ memberId, ...v }))
      .filter((p) => p.cost > 0 || p.tokens > 0)
      .sort((a, b) => b.cost - a.cost)
  }, [tokenData, apiData])

  const totalCost = tokenData?.totalCost ?? apiData?.summary?.totalUsed ?? 0
  const chartData = merged.map((p) => ({ name: p.name, cost: p.cost, fill: p.color }))

  const formatDate = (s: string | null) => {
    if (!s) return "—"
    return new Date(s).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-[#00d4ff]">Token / Maliyet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-[#2a3650]/60 bg-[#0a0e17]/60 p-3">
          <div className="text-[10px] font-mono text-[#8892a8] mb-1">Toplam maliyet</div>
          <div className="text-xl font-bold text-[#f59e0b] font-mono">${typeof totalCost === "number" ? totalCost.toFixed(2) : "0.00"}</div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
          {merged.slice(0, 8).map((p) => (
            <div key={p.memberId} className="rounded border p-1.5" style={{ borderColor: `${p.color}30`, background: `${p.color}08` }}>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                <span className="text-[9px] font-mono truncate" style={{ color: p.color }}>{p.name}</span>
              </div>
              <div className="text-[10px] font-mono text-[#e2e8f0]">${p.cost.toFixed(2)}</div>
              <div className="text-[8px] text-[#8892a8]">{formatDate(p.lastUsed)}</div>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#8892a8" }} />
                <YAxis tick={{ fontSize: 8, fill: "#8892a8" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#0a0e17", border: "1px solid #2a3650", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Maliyet"]}
                />
                <Bar dataKey="cost" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
