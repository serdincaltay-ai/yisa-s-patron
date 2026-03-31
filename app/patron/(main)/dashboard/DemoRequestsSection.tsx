"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import type { DemoRequest } from "@/lib/types"

const STATUS_COLORS: Record<string, string> = {
  beklemede: "#e94560",
  yeni: "#e94560",
  onaylandi: "#00d4ff",
  reddedildi: "#6b7280",
  donustu: "#10b981",
  iptal: "#6b7280",
  gorusuldu: "#00d4ff",
}

const STATUS_LABEL: Record<string, string> = {
  beklemede: "Beklemede",
  yeni: "Yeni",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  donustu: "Dönüştü",
  iptal: "İptal",
  gorusuldu: "Görüşüldü",
}

function formatDate(s: string | undefined) {
  if (!s) return "—"
  const d = new Date(s)
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function DemoRequestsSection({ requests }: { requests: DemoRequest[] }) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  const handleApprove = async (r: DemoRequest) => {
    if (!r.id) return
    setUpdating(r.id)
    try {
      const res = await fetch(`/api/demo-requests/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "onaylandi" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error?.message || "Onay işlemi başarısız"
        toast({ title: "Hata", description: msg, variant: "destructive" })
        return
      }
      toast({
        title: "Başarılı",
        description: `${r.name ?? "Talep"} onaylandı`,
        variant: "success",
      })
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bir hata oluştu"
      toast({ title: "Hata", description: msg, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const handleReject = async (r: DemoRequest) => {
    if (!r.id) return
    setUpdating(r.id)
    try {
      const res = await fetch(`/api/demo-requests/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reddedildi" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error?.message || "Red işlemi başarısız"
        toast({ title: "Hata", description: msg, variant: "destructive" })
        return
      }
      toast({ title: "Talep reddedildi", variant: "success" })
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bir hata oluştu"
      toast({ title: "Hata", description: msg, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-[#e2e8f0]">Demo Talepleri (Yeni)</h3>
      {requests.length === 0 ? (
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-8 text-center">
          <p className="text-[#8892a8] font-medium">Yeni demo talebi yok</p>
          <p className="text-sm text-[#8892a8]/80 mt-1">
            Yeni talepler burada listelenecek.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#0f3460]/40 bg-[#0f3460]/10">
                  <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Ad</th>
                  <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Tesis / Şehir</th>
                  <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Tarih</th>
                  <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Durum</th>
                  <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#0f3460]/20 hover:bg-[#0f3460]/5"
                  >
                    <td className="py-3 px-4 text-[#e2e8f0]">{r.name}</td>
                    <td className="py-3 px-4 text-[#e2e8f0]">{r.email}</td>
                    <td className="py-3 px-4 text-[#e2e8f0]">{r.facility_type || r.city || "—"}</td>
                    <td className="py-3 px-4 text-[#8892a8]">{formatDate(r.created_at)}</td>
                    <td className="py-3 px-4">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${STATUS_COLORS[r.status] ?? "#6b7280"}20`,
                          color: STATUS_COLORS[r.status] ?? "#9ca3af",
                        }}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="min-h-[36px] bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
                          onClick={() => handleApprove(r)}
                          disabled={!!updating}
                        >
                          {updating === r.id ? "İşleniyor…" : "Onayla"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[36px] border-[#6b7280]/50 text-[#9ca3af] hover:bg-[#6b7280]/20"
                          onClick={() => handleReject(r)}
                          disabled={!!updating}
                        >
                          {updating === r.id ? "İşleniyor…" : "Reddet"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
