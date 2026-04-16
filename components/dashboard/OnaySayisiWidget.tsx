"use client"

import useSWR from "swr"
import { ClipboardCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DemoRequestItem {
  status?: string | null
}

interface DemoRequestResponse {
  data?: DemoRequestItem[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<DemoRequestResponse>
}

export default function OnaySayisiWidget() {
  const { data, error } = useSWR("/api/demo-requests?limit=500", fetcher, { refreshInterval: 60000 })
  const items = data?.data ?? []

  const pending = items.filter((item) => item.status === "new" || item.status === "beklemede").length
  const approved = items.filter((item) => item.status === "converted" || item.status === "approved" || item.status === "onaylandi").length
  const rejected = items.filter((item) => item.status === "rejected" || item.status === "reddedildi").length

  return (
    <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-[#f97316]">Onay Sayısı</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-[#2a3650]/60 bg-[#0a0e17]/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#8892a8]">Toplam talep</span>
            <ClipboardCheck className="h-3.5 w-3.5 text-[#f97316]" />
          </div>
          <div className="text-xl font-bold text-[#e2e8f0] font-mono mt-1">{items.length}</div>
        </div>

        {error ? (
          <p className="text-[11px] text-[#ef4444] font-mono">Onay verisi alınamadı.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1.5">
              <p className="text-[9px] text-amber-300 font-mono">Bekleyen</p>
              <p className="text-xs font-semibold text-amber-300">{pending}</p>
            </div>
            <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5">
              <p className="text-[9px] text-emerald-300 font-mono">Onay</p>
              <p className="text-xs font-semibold text-emerald-300">{approved}</p>
            </div>
            <div className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1.5">
              <p className="text-[9px] text-red-300 font-mono">Red</p>
              <p className="text-xs font-semibold text-red-300">{rejected}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
