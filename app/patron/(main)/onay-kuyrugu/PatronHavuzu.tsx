"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Eye, Check, X, Copy } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import ApproveModal from "./ApproveModal"
import RejectModal from "./RejectModal"

type PatronCommand = {
  id: string
  type: "patron_command"
  input: string | null
  task_type: string | null
  scope: string
  priority: number
  status: string
  created_at: string | null
  logs: Array<{ id: string; directorate_code: string; content: unknown; stage: string }>
}

type DemoRequest = {
  id: string
  type: "demo_request"
  name: string
  email: string
  phone: string
  facility_type?: string | null
  city?: string | null
  notes?: string | null
  status: string
  created_at: string | null
}

function parseTitle(input: string | null): string {
  if (!input) return "—"
  try {
    const o = JSON.parse(input)
    return (o?.title ?? input).slice(0, 60) || "—"
  } catch {
    return (input as string).slice(0, 60) || "—"
  }
}

function formatDate(s: string | undefined | null) {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function extractContent(item: PatronCommand | DemoRequest): {
  type: "text" | "image" | "code" | "json"
  value: string
  raw?: unknown
} {
  if (item.type === "demo_request") {
    const d = item as DemoRequest
    const text = `Ad: ${d.name}\nE-posta: ${d.email}\nTelefon: ${d.phone}${d.facility_type ? `\nTesis: ${d.facility_type}` : ""}${d.city ? `\n\u015Eehir: ${d.city}` : ""}\nTarih: ${formatDate(d.created_at)}`
    return { type: "text", value: text }
  }

  const pc = item as PatronCommand
  const logs = pc.logs ?? []
  const firstWithContent = logs.find((l) => l.content != null)

  if (!firstWithContent?.content) {
    const inputStr = pc.input ? (typeof pc.input === "string" ? pc.input : JSON.stringify(pc.input, null, 2)) : "—"
    return { type: "text", value: inputStr }
  }

  const c = firstWithContent.content as Record<string, unknown>
  const gorselUrl = c.gorsel_url
  if (typeof gorselUrl === "string" && gorselUrl) {
    return { type: "image", value: gorselUrl }
  }

  const plan = c.plan
  if (typeof plan === "string") {
    const looksLikeCode = /^[\s]*[{}[\];=<>]|function|const |import |export /m.test(plan)
    return { type: looksLikeCode ? "code" : "text", value: plan }
  }

  return { type: "json", value: JSON.stringify(c, null, 2), raw: c }
}

export default function PatronHavuzu() {
  const [patronCommands, setPatronCommands] = useState<PatronCommand[]>([])
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PatronCommand | DemoRequest | null>(null)
  const [previewTab, setPreviewTab] = useState<"onizleme" | "kod" | "ham">("onizleme")
  const [updating, setUpdating] = useState<string | null>(null)
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

  const fetchData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch("/api/patron-havuzu")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Onay kuyrugu verileri alinamadi")
      }
      setPatronCommands(data.patronCommands ?? [])
      setDemoRequests(data.demoRequests ?? [])
    } catch (error) {
      setPatronCommands([])
      setDemoRequests([])
      setLoadError(error instanceof Error ? error.message : "Onay kuyrugu verileri alinamadi")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApproveDemo = async () => {
    if (!approveModal?.id) return
    setUpdating(approveModal.id)
    try {
      const res = await fetch(`/api/demo-requests/${approveModal.id}/approve`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Hata", description: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Onay başarısız", variant: "destructive" })
        return
      }
      // Credentials bilgisini göster
      if (data.credentials) {
        setCredentialsInfo({
          ...data.credentials,
          subdomain: data.subdomain ?? "",
        })
      }
      toast({
        title: "Tenant oluşturuldu",
        description: `Aktivasyon ucreti kaydedildi ($${data.activation_fee_usd ?? 3000}) · ${data.subdomain ?? ""}`,
        variant: "success",
      })
      setApproveModal(null)
      setSelectedItem(null)
      fetchData()
    } catch (e) {
      toast({ title: "Hata", description: (e as Error).message, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Kopyalandı", variant: "success" })
  }

  const handleRejectDemo = async (reason: string | null) => {
    if (!rejectTarget?.id) return
    setUpdating(rejectTarget.id)
    try {
      const res = await fetch(`/api/demo-requests/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        toast({ title: "Hata", description: "Red işlemi başarısız", variant: "destructive" })
        return
      }
      toast({ title: "Talep reddedildi", variant: "success" })
      setRejectTarget(null)
      setRejectModalOpen(false)
      setSelectedItem(null)
      fetchData()
    } finally {
      setUpdating(null)
    }
  }

  const handleApproveTask = async (taskId: string) => {
    setUpdating(taskId)
    try {
      const res = await fetch("/api/celf/tasks/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, approved: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Hata", description: typeof data?.error === "string" ? data.error : data?.error?.message ?? "Onay başarısız", variant: "destructive" })
        return
      }
      toast({ title: "Görev onaylandı", variant: "success" })
      setSelectedItem(null)
      fetchData()
    } catch (e) {
      toast({ title: "Hata", description: (e as Error).message, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const handleRejectTask = async (taskId: string) => {
    setUpdating(taskId)
    try {
      const res = await fetch("/api/celf/tasks/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, approved: false }),
      })
      if (!res.ok) {
        toast({ title: "Hata", description: "Red başarısız", variant: "destructive" })
        return
      }
      toast({ title: "Görev reddedildi", variant: "success" })
      setSelectedItem(null)
      fetchData()
    } catch (e) {
      toast({ title: "Hata", description: (e as Error).message, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const content = selectedItem ? extractContent(selectedItem) : null

  return (
    <div className="space-y-4">
      <Tabs defaultValue="patron" className="w-full">
        <TabsList className="bg-[#0f3460]/20 border border-[#0f3460]/40">
          <TabsTrigger value="patron" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">
            Patron Komutları ({patronCommands.length})
          </TabsTrigger>
          <TabsTrigger value="demo" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">
            Demo Talepleri ({demoRequests.length})
          </TabsTrigger>
        </TabsList>

        {loadError && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            Veri yuklenemedi: {loadError}
          </div>
        )}

        <div className="flex gap-4 mt-4 min-h-[400px]">
          {/* Sol: Kart listesi */}
          <div className={`overflow-y-auto ${selectedItem ? "w-1/2 lg:w-2/5" : "w-full"} space-y-2`}>
            <TabsContent value="patron" className="m-0">
              {loading ? (
                <div className="text-[#8892a8] text-sm py-8">Yükleniyor…</div>
              ) : patronCommands.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#0f3460]/40 p-8 text-center text-[#8892a8]">
                  Onay bekleyen patron komutu yok
                </div>
              ) : (
                patronCommands.map((pc) => (
                  <div
                    key={pc.id}
                    className={`rounded-xl border p-3 transition-all cursor-pointer ${
                      selectedItem?.id === pc.id && selectedItem?.type === "patron_command"
                        ? "border-[#00d4ff] bg-[#00d4ff]/05"
                        : "border-[#0f3460]/40 bg-[#0a0a1a]/80 hover:border-[#0f3460]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#e2e8f0] truncate">{parseTitle(pc.input)}</div>
                        <div className="text-xs text-[#8892a8] mt-0.5">{formatDate(pc.created_at)} · {pc.logs?.length ?? 0} direktörlük</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setSelectedItem(pc); setPreviewTab("onizleme") }}
                          className="p-1.5 rounded border border-[#0f3460]/40 hover:border-[#00d4ff]/40 text-[#8892a8] hover:text-[#00d4ff]"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Button size="sm" className="h-7 text-[10px] bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40" onClick={() => handleApproveTask(pc.id)} disabled={!!updating}>
                          <Check className="h-3 w-3 mr-1" /> Onayla
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#ef4444]/40 text-[#ef4444]" onClick={() => handleRejectTask(pc.id)} disabled={!!updating}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="demo" className="m-0">
              {loading ? (
                <div className="text-[#8892a8] text-sm py-8">Yükleniyor…</div>
              ) : demoRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#0f3460]/40 p-8 text-center text-[#8892a8]">
                  Bekleyen demo talebi yok
                </div>
              ) : (
                demoRequests.map((dr) => (
                  <div
                    key={dr.id}
                    className={`rounded-xl border p-3 transition-all cursor-pointer ${
                      selectedItem?.id === dr.id && selectedItem?.type === "demo_request"
                        ? "border-[#00d4ff] bg-[#00d4ff]/05"
                        : "border-[#0f3460]/40 bg-[#0a0a1a]/80 hover:border-[#0f3460]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#e2e8f0]">{dr.name}</div>
                        <div className="text-xs text-[#8892a8]">{dr.email} · {formatDate(dr.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setSelectedItem(dr); setPreviewTab("onizleme") }}
                          className="p-1.5 rounded border border-[#0f3460]/40 hover:border-[#00d4ff]/40 text-[#8892a8] hover:text-[#00d4ff]"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Button size="sm" className="h-7 text-[10px] bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40" onClick={() => setApproveModal(dr)} disabled={!!updating}>
                          Onayla
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#6b7280]/50 text-[#9ca3af]" onClick={() => { setRejectTarget(dr); setRejectModalOpen(true) }} disabled={!!updating}>
                          Reddet
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </div>

          {/* Sağ: Önizleme paneli */}
          {selectedItem && (
            <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/90 overflow-hidden">
              <div className="border-b border-[#0f3460]/40 px-3 py-2 flex items-center justify-between flex-shrink-0">
                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "onizleme" | "kod" | "ham")}>
                  <TabsList className="h-8 bg-transparent border-0 p-0 gap-2">
                    <TabsTrigger value="onizleme" className="text-xs data-[state=active]:text-[#00d4ff]">Önizleme</TabsTrigger>
                    <TabsTrigger value="kod" className="text-xs data-[state=active]:text-[#00d4ff]">&lt;/&gt; Kod</TabsTrigger>
                    <TabsTrigger value="ham" className="text-xs data-[state=active]:text-[#00d4ff]">Ham Veri</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {previewTab === "onizleme" && content && (
                  <div className="space-y-3">
                    {content.type === "image" && (
                      <Image
                        src={content.value}
                        alt="Onizleme"
                        width={1024}
                        height={640}
                        unoptimized
                        className="max-w-full h-auto rounded border border-[#0f3460]/40"
                      />
                    )}
                    {content.type === "text" && <pre className="text-sm text-[#e2e8f0] whitespace-pre-wrap font-sans">{content.value}</pre>}
                    {content.type === "code" && (
                      <SyntaxHighlighter language="javascript" style={oneDark} customStyle={{ margin: 0, borderRadius: 8 }} showLineNumbers>
                        {content.value}
                      </SyntaxHighlighter>
                    )}
                    {content.type === "json" && <pre className="text-xs text-[#8892a8] overflow-auto">{content.value}</pre>}
                  </div>
                )}
                {previewTab === "kod" && content && (content.type === "code" || content.type === "json") && (
                  <SyntaxHighlighter language={content.type === "json" ? "json" : "javascript"} style={oneDark} customStyle={{ margin: 0, borderRadius: 8 }} showLineNumbers>
                    {content.value}
                  </SyntaxHighlighter>
                )}
                {previewTab === "kod" && content && content.type !== "code" && content.type !== "json" && (
                  <pre className="text-xs text-[#8892a8] overflow-auto">{content.value}</pre>
                )}
                {previewTab === "ham" && selectedItem && (
                  <pre className="text-xs text-[#8892a8] overflow-auto">
                    {selectedItem.type === "patron_command"
                      ? JSON.stringify(selectedItem, null, 2)
                      : JSON.stringify(selectedItem, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </Tabs>

      <ApproveModal
        open={!!approveModal}
        onOpenChange={(o) => !o && setApproveModal(null)}
        request={approveModal ? { id: approveModal.id, name: approveModal.name, phone: approveModal.phone } : null}
        onConfirm={handleApproveDemo}
        isLoading={!!updating}
      />
      <RejectModal open={rejectModalOpen} onOpenChange={setRejectModalOpen} onConfirm={handleRejectDemo} isLoading={!!updating} />

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
