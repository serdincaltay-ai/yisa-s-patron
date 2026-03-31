"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"
import ApproveModal from "./ApproveModal"
import RejectModal from "./RejectModal"
import type { DemoRequest } from "@/lib/types"

const STATUS_COLORS: Record<string, string> = {
  new: "#e94560",
  onaylandi: "#00d4ff",
  reddedildi: "#6b7280",
  gorusuldu: "#00d4ff",
}

const STATUS_LABEL: Record<string, string> = {
  new: "Beklemede",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  gorusuldu: "Görüşüldü",
}

function formatDate(s: string | undefined) {
  if (!s) return "—"
  const d = new Date(s)
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function OnayKuyruguList({ requests }: { requests: DemoRequest[] }) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approveModal, setApproveModal] = useState<DemoRequest | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<DemoRequest | null>(null)
  const [credentialsInfo, setCredentialsInfo] = useState<{
    username: string
    temp_password: string
    auth_email: string
    expires_at: string
    subdomain: string
  } | null>(null)

  const handleApproveConfirm = async () => {
    if (!approveModal?.id) return
    setUpdating(approveModal.id)
    setError(null)
    try {
      const res = await fetch(`/api/demo-requests/${approveModal.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error?.message || "Onay işlemi başarısız"
        toast({ title: "Hata", description: msg, variant: "destructive" })
        return
      }
      const subdomain = data.subdomain || `${data.slug}.yisa-s.com`
      // Credentials bilgisini goster
      if (data.credentials) {
        setCredentialsInfo({
          ...data.credentials,
          subdomain,
        })
      }
      toast({
        title: "Tenant oluşturuldu",
        description: subdomain,
        variant: "success",
      })
      setApproveModal(null)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bir hata oluştu"
      toast({ title: "Hata", description: msg, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const handleRejectConfirm = async (reason: string | null) => {
    if (!rejectTarget?.id) return
    setUpdating(rejectTarget.id)
    setError(null)
    try {
      const res = await fetch(`/api/demo-requests/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error?.message || "Red işlemi başarısız"
        toast({ title: "Hata", description: msg, variant: "destructive" })
        return
      }
      toast({
        title: "Talep reddedildi",
        variant: "success",
      })
      setRejectTarget(null)
      setRejectModalOpen(false)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bir hata oluştu"
      toast({ title: "Hata", description: msg, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const openReject = (r: DemoRequest) => {
    setRejectTarget(r)
    setRejectModalOpen(true)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Kopyalandı", variant: "success" })
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-8 text-center">
        <p className="text-[#8892a8] font-medium">Bekleyen talep yok</p>
        <p className="text-sm text-[#8892a8]/80 mt-1">Yeni demo talepleri burada listelenecek.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-[#e94560]/40 bg-[#e94560]/10 px-4 py-3 text-sm text-[#e94560]">
          {error}
        </div>
      )}

      <ApproveModal
        open={!!approveModal}
        onOpenChange={(open) => !open && setApproveModal(null)}
        request={approveModal ? { id: approveModal.id!, name: approveModal.name, phone: approveModal.phone } : null}
        onConfirm={handleApproveConfirm}
        isLoading={!!updating}
      />
      <RejectModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onConfirm={handleRejectConfirm}
        isLoading={!!updating}
      />

      {/* Mobil: kart listesi */}
      <div className="block md:hidden space-y-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-[#e2e8f0]">{r.name}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${STATUS_COLORS[r.status] || "#6b7280"}20`, color: STATUS_COLORS[r.status] || "#9ca3af" }}
              >
                {STATUS_LABEL[r.status] || r.status}
              </span>
            </div>
            <div className="text-sm text-[#8892a8]">
              <p><span className="text-[#e2e8f0]/80">Tesis:</span> {r.facility_type || r.city || "—"}</p>
              <p><span className="text-[#e2e8f0]/80">Telefon:</span> {r.phone}</p>
              <p><span className="text-[#e2e8f0]/80">Tarih:</span> {formatDate(r.created_at)}</p>
            </div>
            {r.status === "new" && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="min-h-[44px] min-w-[44px] flex-1 bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
                  onClick={() => setApproveModal(r)}
                  disabled={!!updating}
                >
                  {updating === r.id ? "İşleniyor…" : "Onayla"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] min-w-[44px] flex-1 border-[#6b7280]/50 text-[#9ca3af] hover:bg-[#6b7280]/20"
                  onClick={() => openReject(r)}
                  disabled={!!updating}
                >
                  {updating === r.id ? "İşleniyor…" : "Reddet"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Tablet/Desktop: tablo */}
      <div className="hidden md:block rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0f3460]/40 bg-[#0f3460]/10">
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">İsim</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Tesis</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Telefon</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Tarih</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Durum</th>
                <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-[#0f3460]/20 hover:bg-[#0f3460]/5">
                  <td className="py-3 px-4 text-[#e2e8f0]">{r.name}</td>
                  <td className="py-3 px-4 text-[#e2e8f0]">{r.facility_type || r.city || "—"}</td>
                  <td className="py-3 px-4 text-[#8892a8]">{r.phone}</td>
                  <td className="py-3 px-4 text-[#8892a8]">{formatDate(r.created_at)}</td>
                  <td className="py-3 px-4">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${STATUS_COLORS[r.status] || "#6b7280"}20`, color: STATUS_COLORS[r.status] || "#9ca3af" }}
                    >
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.status === "new" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="min-h-[44px] min-w-[44px] bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
                          onClick={() => setApproveModal(r)}
                          disabled={!!updating}
                        >
                          {updating === r.id ? "İşleniyor…" : "Onayla"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[44px] min-w-[44px] border-[#6b7280]/50 text-[#9ca3af] hover:bg-[#6b7280]/20"
                          onClick={() => openReject(r)}
                          disabled={!!updating}
                        >
                          {updating === r.id ? "İşleniyor…" : "Reddet"}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[#8892a8] text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Demo Credentials Modal */}
      {credentialsInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0a0a1a] border border-[#0f3460]/40 rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-[#e2e8f0]">Demo Hesap Bilgileri</h3>
            <p className="text-sm text-[#8892a8]">Asagidaki bilgileri firma yetkilisine iletin:</p>
            <div className="bg-[#0f3460]/20 rounded-lg p-4 space-y-2 font-mono text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#8892a8]">Giris:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#00d4ff]">{credentialsInfo.subdomain}</span>
                  <button onClick={() => copyToClipboard(`https://${credentialsInfo.subdomain}`)} className="text-[#8892a8] hover:text-[#00d4ff]">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8892a8]">Giris E-posta:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#e2e8f0]">{credentialsInfo.auth_email}</span>
                  <button onClick={() => copyToClipboard(credentialsInfo.auth_email)} className="text-[#8892a8] hover:text-[#00d4ff]">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8892a8]">Sifre:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#e2e8f0]">{credentialsInfo.temp_password}</span>
                  <button onClick={() => copyToClipboard(credentialsInfo.temp_password)} className="text-[#8892a8] hover:text-[#00d4ff]">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8892a8]">Bitis:</span>
                <span className="text-[#e94560]">{new Date(credentialsInfo.expires_at).toLocaleDateString("tr-TR")}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                className="bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
                onClick={() => {
                  const text = `Giris: https://${credentialsInfo.subdomain}\nGiris E-posta: ${credentialsInfo.auth_email}\nSifre: ${credentialsInfo.temp_password}`
                  copyToClipboard(text)
                }}
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Tumunu Kopyala
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#0f3460]/60 text-[#8892a8] hover:bg-[#0f3460]/20"
                onClick={() => setCredentialsInfo(null)}
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
