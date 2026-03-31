"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

type DemoRow = {
  id: string
  name?: string
  email?: string
  phone?: string
  facility_type?: string
  city?: string
  status?: string
  created_at?: string
}

export default function TaleplerPanel() {
  const [list, setList] = useState<DemoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchList = () => {
    fetch("/api/demo-requests?status=new&limit=50")
      .then((r) => r.json())
      .then((d) => setList(d?.data ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleApprove = async (row: DemoRow) => {
    if (!row.id) return
    setUpdating(row.id)
    try {
      const res = await fetch("/api/demo-requests/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decide", approve: true, id: row.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Hata",
          description: data?.error?.message ?? "Onay işlemi başarısız",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Onaylandı",
        description: `Tenant oluşturuldu. Franchise yetkilisine e-posta gönderildi.`,
      })
      fetchList()
    } finally {
      setUpdating(null)
    }
  }

  function formatDate(s: string | undefined) {
    if (!s) return "—"
    return new Date(s).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h2 className="text-xl font-bold text-[#e2e8f0] font-mono">TALEPLER</h2>
      <p className="text-sm text-[#8892a8]">Bekleyen demo talepleri. Onay sonrası franchise yetkilisine e-posta gider.</p>

      {loading ? (
        <p className="text-[#8892a8] text-sm">Yükleniyor...</p>
      ) : list.length === 0 ? (
        <p className="text-[#8892a8] text-sm">Bekleyen talep yok.</p>
      ) : (
        <div className="space-y-2">
          {list.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-[#0f3460]/40 bg-[#0a0e17]/80 p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-[#e2e8f0]">{row.name ?? "—"}</p>
                <p className="text-sm text-[#8892a8]">
                  {row.email ?? "—"} · {row.phone ?? "—"}
                </p>
                <p className="text-xs text-[#8892a8] mt-1">{formatDate(row.created_at)}</p>
              </div>
              <Button
                className="bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30"
                onClick={() => handleApprove(row)}
                disabled={updating === row.id}
              >
                {updating === row.id ? "İşleniyor..." : "Onayla"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
