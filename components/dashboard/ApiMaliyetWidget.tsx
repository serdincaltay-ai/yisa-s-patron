"use client"

import useSWR from "swr"
import { Cpu } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SummaryResponse {
  gider?: {
    apiMaliyeti?: number
    toplamIsletme?: number
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<SummaryResponse>
}

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

export default function ApiMaliyetWidget() {
  const { data, error } = useSWR("/api/kasa/summary", fetcher, { refreshInterval: 60000 })

  const apiMaliyeti = Number(data?.gider?.apiMaliyeti) || 0
  const toplamIsletme = Number(data?.gider?.toplamIsletme) || 0
  const oran = toplamIsletme > 0 ? Math.round((apiMaliyeti / toplamIsletme) * 100) : 0

  return (
    <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-[#f59e0b]">API Maliyet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-[#2a3650]/60 bg-[#0a0e17]/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#8892a8]">Toplam API gideri</span>
            <Cpu className="h-3.5 w-3.5 text-[#f59e0b]" />
          </div>
          <div className="text-lg font-bold text-[#f59e0b] font-mono mt-1">{formatUsd(apiMaliyeti)}</div>
        </div>

        {error ? (
          <p className="text-[11px] text-[#ef4444] font-mono">API maliyeti alınamadı.</p>
        ) : (
          <div className="rounded border border-[#2a3650]/60 bg-[#0a0e17]/60 px-2 py-1.5">
            <p className="text-[9px] text-[#94a3b8] font-mono">İşletme içindeki pay</p>
            <p className="text-xs font-semibold text-[#e2e8f0]">%{oran}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
