"use client"

import useSWR from "swr"
import { Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<Record<string, boolean>>
}

const ROBOT_ORDER = [
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
  { id: "gpt", label: "GPT" },
  { id: "together", label: "Together" },
]

export default function RobotStatusWidget() {
  const { data, error } = useSWR("/api/robot-status", fetcher, { refreshInterval: 45000 })

  const onlineCount = ROBOT_ORDER.filter((item) => data?.[item.id]).length

  return (
    <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-[#22d3ee]">Robot Durum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-[#2a3650]/60 bg-[#0a0e17]/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#8892a8]">Aktif robot</span>
            <Bot className="h-3.5 w-3.5 text-[#22d3ee]" />
          </div>
          <div className="text-xl font-bold text-[#22d3ee] font-mono mt-1">
            {data ? `${onlineCount}/${ROBOT_ORDER.length}` : "—"}
          </div>
        </div>

        {error ? (
          <p className="text-[11px] text-[#ef4444] font-mono">Robot durumu alınamadı.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {ROBOT_ORDER.map((robot) => {
              const isOnline = Boolean(data?.[robot.id])
              return (
                <div key={robot.id} className="rounded border border-[#2a3650]/60 bg-[#0a0e17]/60 px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-[#64748b]"}`}
                    />
                    <span className="text-[10px] text-[#e2e8f0] font-mono">{robot.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
