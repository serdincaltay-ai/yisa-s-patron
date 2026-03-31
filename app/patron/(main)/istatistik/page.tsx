"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type StatData = { label: string; value: string | number; change?: string; color: string }
type BranchStat = { name: string; members: number; attendanceRate: number; revenue: string; trend: string }

export default function IstatistikPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"hafta" | "ay" | "yil">("ay")
  const [stats, setStats] = useState<StatData[]>([])
  const [branchStats, setBranchStats] = useState<BranchStat[]>([])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/istatistik?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.stats)) setStats(data.stats)
        if (Array.isArray(data.branchStats)) setBranchStats(data.branchStats)
      }
    } catch {
      // API hatasi — bos goster
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">Detayli Istatistikler</h2>
          <p className="text-sm text-[#8892a8] mt-1">Tesis performans metrikleri ve trendler.</p>
        </div>
        <div className="flex gap-2">
          {(["hafta", "ay", "yil"] as const).map((p) => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)} className={period === p ? "bg-[#00d4ff] text-black" : "border-[#2a3650] text-[#e2e8f0]"}>
              {p === "hafta" ? "Hafta" : p === "ay" ? "Ay" : "Yil"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-[#8892a8]">Yukleniyor...</p> : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Card key={i} className="border-[#2a3650] bg-[#0a0e17]/90">
                <CardContent className="p-4">
                  <p className="text-xs text-[#8892a8] mb-1">{s.label}</p>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  {s.change && <p className="text-xs mt-1 text-[#8892a8]">{s.change} bu donem</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardHeader><CardTitle className="text-[#e2e8f0]">Brans Bazli Performans</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a3650] text-left">
                      <th className="py-2 pr-4 text-[#818cf8]">Brans</th>
                      <th className="py-2 pr-4 text-[#818cf8]">Uye</th>
                      <th className="py-2 pr-4 text-[#818cf8]">Yoklama %</th>
                      <th className="py-2 pr-4 text-[#818cf8]">Gelir</th>
                      <th className="py-2 text-[#818cf8]">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#cbd5e1]">
                    {branchStats.length > 0 ? (
                      branchStats.map((row, i) => (
                        <tr key={i} className="border-b border-[#2a3650]/60">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4">{row.members}</td>
                          <td className="py-2 pr-4">%{row.attendanceRate}</td>
                          <td className="py-2 pr-4">{row.revenue}</td>
                          <td className="py-2 text-emerald-400">{row.trend}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[#8892a8]">
                          Brans verisi henuz mevcut degil.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
