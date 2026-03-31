"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  LayoutTemplate,
  Globe,
  Settings2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

// ==================== TYPES ====================

interface TenantBasic {
  id: string
  ad: string
  slug: string
  durum: string
}

interface SlotData {
  id: string
  tenant_id: string
  template_id: string
  slot_code: string
  content: Record<string, unknown> | null
  is_active: boolean
  updated_at: string | null
}

interface TemplateData {
  id: string
  template_key: string
  name: string
  description: string
  tier: string
  slot_count: number
  active_slots: string[]
}

interface TenantSlotResponse {
  tenant: TenantBasic
  template: TemplateData | null
  slots: SlotData[]
}

const SLOT_LABELS: Record<string, { label: string; description: string }> = {
  hero: { label: "Hero Banner", description: "Ana sayfa ust kisim — baslik, aciklama, gorsel" },
  program: { label: "Program / Ders", description: "Ders programi ve antrenman takvimi" },
  trainer: { label: "Antrenor Kadro", description: "Antrenor listesi ve profilleri" },
  aidat: { label: "Aidat / Fiyat", description: "Ucret tablosu ve odeme bilgileri" },
  kayit: { label: "Kayit Formu", description: "Online kayit / basvuru formu" },
  galeri: { label: "Galeri", description: "Foto ve video galerisi" },
  duyuru: { label: "Duyurular", description: "Haber ve duyuru akisi" },
  iletisim: { label: "Iletisim", description: "Adres, telefon, harita" },
  hakkimizda: { label: "Hakkimizda", description: "Tesis tanitimi, vizyon, misyon" },
  referans: { label: "Referanslar", description: "Basari hikayeleri, veli yorumlari" },
}

// ==================== MAIN COMPONENT ====================

export default function VitrinYonetimiPage() {
  const [tenants, setTenants] = useState<TenantBasic[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [slotData, setSlotData] = useState<TenantSlotResponse | null>(null)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>("")
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Fetch tenants
  useEffect(() => {
    fetch("/api/patron/tenants")
      .then((r) => r.json())
      .then((json) => setTenants(json.tenants ?? []))
      .catch(() => {})
      .finally(() => setLoadingTenants(false))
  }, [])

  // Fetch slots for selected tenant
  const fetchSlots = useCallback(async (tenantId: string) => {
    setLoadingSlots(true)
    setSlotData(null)
    try {
      const res = await fetch(`/api/patron/tenants/${tenantId}/slots`)
      if (res.ok) {
        const data = await res.json()
        setSlotData(data)
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingSlots(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTenant) fetchSlots(selectedTenant)
  }, [selectedTenant, fetchSlots])

  // Toggle slot active/inactive
  const handleToggleSlot = async (slotCode: string, currentActive: boolean) => {
    if (!selectedTenant) return
    setSaving(slotCode)
    try {
      const res = await fetch(`/api/patron/tenants/${selectedTenant}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_code: slotCode, is_active: !currentActive }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: `${slotCode} slot ${!currentActive ? "aktif" : "pasif"} yapildi` })
        await fetchSlots(selectedTenant)
      } else {
        setMessage({ type: "error", text: "Slot guncellenemedi" })
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" })
    } finally {
      setSaving(null)
    }
  }

  // Save slot content
  const handleSaveContent = async (slotCode: string) => {
    if (!selectedTenant) return
    setSaving(slotCode)
    try {
      let parsed: Record<string, unknown>
      try {
        parsed = JSON.parse(editContent)
      } catch {
        setMessage({ type: "error", text: "Gecersiz JSON formati" })
        setSaving(null)
        return
      }

      const res = await fetch(`/api/patron/tenants/${selectedTenant}/slots`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_code: slotCode, content: parsed }),
      })
      if (res.ok) {
        setMessage({ type: "success", text: `${slotCode} icerigi kaydedildi` })
        await fetchSlots(selectedTenant)
        setExpandedSlot(null)
      } else {
        setMessage({ type: "error", text: "Icerik kaydedilemedi" })
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" })
    } finally {
      setSaving(null)
    }
  }

  const activeSlotCount = slotData?.slots?.filter((s) => s.is_active).length ?? 0
  const totalSlotCount = slotData?.slots?.length ?? 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight flex items-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-[#00d4ff]" />
          Vitrin Slot Yonetimi
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Tenant vitrin sayfalarinin slot iceriklerini yonetin, sablonlari degistirin.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg ${message.type === "success" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#ef4444]/10 text-[#ef4444]"}`}>
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Left: Tenant List */}
        <Card className="border-[#2a3650] bg-[#0a0e17]/90">
          <CardHeader>
            <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00d4ff]" />
              Tenantlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
            {loadingTenants ? (
              <p className="text-sm text-[#8892a8]">Yukleniyor...</p>
            ) : tenants.length === 0 ? (
              <p className="text-sm text-[#8892a8]">Henuz tenant yok.</p>
            ) : (
              tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTenant(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTenant === t.id
                      ? "bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30"
                      : "text-[#e2e8f0] hover:bg-[#0f3460]/20"
                  }`}
                >
                  <span className="font-medium">{t.ad}</span>
                  <span className="text-xs text-[#8892a8] ml-2">{t.slug}.yisa-s.com</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Slot Management */}
        <div className="space-y-4">
          {!selectedTenant ? (
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardContent className="p-8 text-center">
                <Settings2 className="w-12 h-12 text-[#8892a8] mx-auto mb-3 opacity-50" />
                <p className="text-[#8892a8]">Sol taraftan bir tenant secin.</p>
              </CardContent>
            </Card>
          ) : loadingSlots ? (
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardContent className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-[#00d4ff] mx-auto mb-3 animate-spin" />
                <p className="text-[#8892a8]">Slot verileri yukleniyor...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Template Info */}
              <Card className="border-[#2a3650] bg-[#0a0e17]/90">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-[#e2e8f0]">
                        {slotData?.tenant.ad ?? "—"}
                      </h3>
                      <p className="text-xs text-[#8892a8] mt-0.5">
                        Sablon: {slotData?.template?.name ?? "Atanmamis"} ({slotData?.template?.tier ?? "—"})
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#00d4ff] font-mono">
                        {activeSlotCount}/{totalSlotCount} aktif
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectedTenant && fetchSlots(selectedTenant)}
                        className="border-[#2a3650] text-[#8892a8] h-7 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Yenile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Slots Table */}
              <Tabs defaultValue="slots" className="w-full">
                <TabsList className="bg-[#0f3460]/20 border border-[#0f3460]/40">
                  <TabsTrigger value="slots" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">
                    Slotlar ({totalSlotCount})
                  </TabsTrigger>
                  <TabsTrigger value="sablon" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">
                    Sablon Bilgisi
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="slots" className="mt-4">
                  <Card className="border-[#2a3650] bg-[#0a0e17]/90">
                    <CardContent className="p-0">
                      {(slotData?.slots ?? []).length === 0 ? (
                        <div className="p-6 text-center text-[#8892a8] text-sm">
                          Bu tenant icin henuz slot tanimlanmamis.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#2a3650]">
                              <TableHead className="text-[#8892a8] w-8"></TableHead>
                              <TableHead className="text-[#8892a8]">Slot</TableHead>
                              <TableHead className="text-[#8892a8]">Aciklama</TableHead>
                              <TableHead className="text-[#8892a8]">Durum</TableHead>
                              <TableHead className="text-[#8892a8]">Son Guncelleme</TableHead>
                              <TableHead className="text-[#8892a8]">Islem</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(slotData?.slots ?? []).map((slot) => {
                              const meta = SLOT_LABELS[slot.slot_code] ?? { label: slot.slot_code, description: "" }
                              const isExpanded = expandedSlot === slot.slot_code
                              return (
                                <>
                                  <TableRow key={slot.id} className="border-[#2a3650]/60">
                                    <TableCell>
                                      <button
                                        onClick={() => {
                                          if (isExpanded) {
                                            setExpandedSlot(null)
                                          } else {
                                            setExpandedSlot(slot.slot_code)
                                            setEditContent(JSON.stringify(slot.content ?? {}, null, 2))
                                          }
                                        }}
                                        className="text-[#8892a8] hover:text-[#00d4ff]"
                                      >
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </button>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-[#e2e8f0] text-sm font-medium">{meta.label}</span>
                                      <span className="text-[#8892a8] text-xs ml-1 font-mono">({slot.slot_code})</span>
                                    </TableCell>
                                    <TableCell className="text-[#8892a8] text-xs">{meta.description}</TableCell>
                                    <TableCell>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        slot.is_active
                                          ? "bg-[#22c55e]/20 text-[#22c55e]"
                                          : "bg-[#8892a8]/20 text-[#8892a8]"
                                      }`}>
                                        {slot.is_active ? "Aktif" : "Pasif"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-[#8892a8] text-xs font-mono">
                                      {slot.updated_at ? new Date(slot.updated_at).toLocaleDateString("tr-TR") : "—"}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleToggleSlot(slot.slot_code, slot.is_active)}
                                          disabled={saving === slot.slot_code}
                                          className="h-7 text-xs"
                                        >
                                          {slot.is_active ? (
                                            <><EyeOff className="w-3 h-3 mr-1 text-[#8892a8]" /> Pasif</>
                                          ) : (
                                            <><Eye className="w-3 h-3 mr-1 text-[#22c55e]" /> Aktif</>
                                          )}
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow key={`${slot.id}-edit`} className="border-[#2a3650]/60">
                                      <TableCell colSpan={6} className="p-4 bg-[#060810]">
                                        <div className="space-y-3">
                                          <p className="text-xs text-[#8892a8]">Slot icerigi (JSON):</p>
                                          <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="font-mono text-xs border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] min-h-[150px]"
                                            rows={8}
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => handleSaveContent(slot.slot_code)}
                                              disabled={saving === slot.slot_code}
                                              className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#22c55e]/30"
                                            >
                                              <Save className="w-3 h-3 mr-1" />
                                              {saving === slot.slot_code ? "Kaydediliyor..." : "Kaydet"}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => setExpandedSlot(null)}
                                              className="border-[#2a3650] text-[#8892a8]"
                                            >
                                              Kapat
                                            </Button>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              )
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="sablon" className="mt-4">
                  <Card className="border-[#2a3650] bg-[#0a0e17]/90">
                    <CardHeader>
                      <CardTitle className="text-[#e2e8f0] text-sm">Sablon Detaylari</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!slotData?.template ? (
                        <p className="text-sm text-[#8892a8]">Bu tenant icin sablon atanmamis.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-[#8892a8]">Sablon Adi</p>
                              <p className="text-sm text-[#e2e8f0]">{slotData.template.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#8892a8]">Tier</p>
                              <p className="text-sm text-[#e2e8f0] capitalize">{slotData.template.tier}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#8892a8]">Template Key</p>
                              <p className="text-sm text-[#00d4ff] font-mono">{slotData.template.template_key}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#8892a8]">Slot Sayisi</p>
                              <p className="text-sm text-[#e2e8f0]">{slotData.template.slot_count}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-[#8892a8] mb-1">Aktif Slotlar</p>
                            <div className="flex flex-wrap gap-1">
                              {(slotData.template.active_slots ?? []).map((s) => (
                                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-[#8892a8] mb-1">Aciklama</p>
                            <p className="text-sm text-[#e2e8f0]">{slotData.template.description}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
