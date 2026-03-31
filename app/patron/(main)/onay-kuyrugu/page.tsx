"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, CheckCircle2, XCircle, Clock } from "lucide-react"
import PatronHavuzu from "./PatronHavuzu"

interface QueueStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export default function OnayKuyruguPage() {
  const [stats, setStats] = useState<QueueStats>({ total: 0, pending: 0, approved: 0, rejected: 0 })

  useEffect(() => {
    fetch("/api/demo-requests?limit=1000")
      .then((r) => r.json())
      .then((json) => {
        const items = json.data ?? []
        setStats({
          total: items.length,
          pending: items.filter((d: { status: string }) => d.status === "new").length,
          approved: items.filter((d: { status: string }) => d.status === "converted").length,
          rejected: items.filter((d: { status: string }) => d.status === "rejected").length,
        })
      })
      .catch(() => {})
  }, [])

  const cards = [
    { label: "Toplam Talep", value: stats.total, icon: ClipboardList, color: "#00d4ff" },
    { label: "Bekleyen", value: stats.pending, icon: Clock, color: "#f59e0b" },
    { label: "Onaylanan", value: stats.approved, icon: CheckCircle2, color: "#22c55e" },
    { label: "Reddedilen", value: stats.rejected, icon: XCircle, color: "#ef4444" },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Onay Kuyrugu
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Demo taleplerini inceleyin, onaylayin veya reddedin. Onaylanan talepler otomatik tenant olusturur.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: c.color + "15", color: c.color }}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#e2e8f0]">{c.value}</p>
                <p className="text-xs text-[#8892a8]">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PatronHavuzu />
    </div>
  )
}
