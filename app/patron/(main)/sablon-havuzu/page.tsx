"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  LayoutTemplate,
  Search,
  Filter,
  Star,
  Download,
  ShoppingBag,
  Bot,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  Store,
  Sparkles,
  Tag,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  X,
  Lock,
} from "lucide-react"

// ==================== TYPES ====================

type Template = {
  id: string
  template_key: string
  directorate: string | null
  category: string | null
  content: string | null
  variables: string[] | null
  updated_at: string | null
}

type StoreTemplate = {
  id: string
  name: string
  description: string
  category: string
  price: number
  currency: string
  stars: number
  downloads: number
  author: string
  preview_url: string | null
  tags: string[]
  features: string[]
  is_free: boolean
  is_official: boolean
  created_at: string
}

type VitrinSlot = {
  id: string
  sira_no: number
  sablon_id: string | null
  baslik: string
  onizleme_url: string | null
  aktif: boolean
  created_at: string
  updated_at: string
}

// ==================== CONSTANTS ====================

const DIRECTORATE_COLORS: Record<string, string> = {
  CTO: "#3b82f6",
  CFO: "#10b981",
  CMO: "#f59e0b",
  CPO: "#8b5cf6",
  CLO: "#ef4444",
  CHRO: "#ec4899",
  CSPO: "#06b6d4",
  CSO: "#818cf8",
  CISO: "#e94560",
  CDO: "#a855f7",
  COO: "#14b8a6",
  CCO: "#f97316",
  CRDO: "#84cc16",
}

const STORE_CATEGORIES = [
  { value: "all", label: "Tumunu Goster" },
  { value: "tesis_yonetim", label: "Tesis Yonetim" },
  { value: "web_sitesi", label: "Web Sitesi" },
  { value: "vitrin", label: "Vitrin" },
  { value: "muhasebe", label: "Muhasebe" },
  { value: "ik", label: "IK" },
  { value: "pazarlama", label: "Pazarlama" },
]

const CATEGORY_ICONS: Record<string, string> = {
  tesis_yonetim: "🏟️",
  web_sitesi: "🌐",
  vitrin: "🪟",
  muhasebe: "📊",
  ik: "👥",
  pazarlama: "📢",
}

// ==================== HELPERS ====================

function getDirectorateColor(code: string | null): string {
  if (!code) return "#8892a8"
  return DIRECTORATE_COLORS[code] ?? "#8892a8"
}

function renderContentPreview(template: Template): string {
  if (template.content && template.content.trim().length > 0) {
    return template.content
  }
  const key = template.template_key || ""
  const parts = key.replace(/_/g, " ").replace(/-/g, " ")
  const dir = template.directorate ? `[${template.directorate}] ` : ""
  const cat = template.category ? `Kategori: ${template.category}` : ""
  return `${dir}${parts}\n${cat}\n\nBu sablon henuz icerik eklenmemis. Sablonu duzenlemek icin tiklayin.`
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return "Ucretsiz"
  return `${price} ${currency}`
}

function renderStars(rating: number): string {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5 ? 1 : 0
  return "\u2605".repeat(full) + (half ? "\u00BD" : "") + "\u2606".repeat(5 - full - half)
}

// ==================== BENIM SABLONLARIM TAB ====================

function BenimSablonlarimTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterDir, setFilterDir] = useState<string>("all")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Vitrin slots state
  const [vitrinSlots, setVitrinSlots] = useState<VitrinSlot[]>([])
  const [vitrinLoading, setVitrinLoading] = useState(true)
  const [vitrinBusy, setVitrinBusy] = useState(false)

  const fetchVitrinSlots = useCallback(() => {
    setVitrinLoading(true)
    fetch("/api/vitrin/slots?aktif=false")
      .then((r) => r.json())
      .then((d) => setVitrinSlots(d.data ?? []))
      .catch(() => {})
      .finally(() => setVitrinLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchVitrinSlots()
  }, [fetchVitrinSlots])

  const directorates = Array.from(new Set(templates.map((t) => t.directorate).filter(Boolean))) as string[]

  const filtered = templates.filter((t) => {
    const matchesSearch =
      !search ||
      (t.template_key ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.content ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesDir = filterDir === "all" || t.directorate === filterDir
    return matchesSearch && matchesDir
  })

  /** Şablonu vitrine yerleştir */
  const handleAddToVitrin = async (template: Template) => {
    if (vitrinBusy) return
    setVitrinBusy(true)
    try {
      const res = await fetch("/api/vitrin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sablon_id: template.id,
          baslik: (template.template_key ?? "").replace(/_/g, " "),
          onizleme_url: null,
        }),
      })
      if (res.ok) {
        fetchVitrinSlots()
      }
    } catch {
      // ignore
    } finally {
      setVitrinBusy(false)
    }
  }

  /** Sıra yukarı/aşağı taşı */
  const handleMoveSlot = async (slot: VitrinSlot, direction: "up" | "down") => {
    if (vitrinBusy) return
    const sorted = vitrinSlots.filter((s) => s.aktif).sort((a, b) => a.sira_no - b.sira_no)
    const idx = sorted.findIndex((s) => s.id === slot.id)
    if (idx < 0) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const targetSiraNo = sorted[swapIdx].sira_no
    setVitrinBusy(true)
    try {
      const res = await fetch("/api/vitrin/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: slot.id, sira_no: targetSiraNo }),
      })
      if (res.ok) {
        fetchVitrinSlots()
      }
    } catch {
      // ignore
    } finally {
      setVitrinBusy(false)
    }
  }

  /** Slot aktiflik toggle */
  const handleToggleAktif = async (slot: VitrinSlot) => {
    if (vitrinBusy) return
    setVitrinBusy(true)
    try {
      const res = await fetch("/api/vitrin/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: slot.id, aktif: !slot.aktif }),
      })
      if (res.ok) {
        fetchVitrinSlots()
      }
    } catch {
      // ignore
    } finally {
      setVitrinBusy(false)
    }
  }

  /** Slot sil */
  const handleDeleteSlot = async (slot: VitrinSlot) => {
    if (vitrinBusy) return
    setVitrinBusy(true)
    try {
      const res = await fetch(`/api/vitrin/slots?id=${slot.id}`, { method: "DELETE" })
      if (res.ok) {
        fetchVitrinSlots()
      }
    } catch {
      // ignore
    } finally {
      setVitrinBusy(false)
    }
  }

  const activeSlots = vitrinSlots.filter((s) => s.aktif).sort((a, b) => a.sira_no - b.sira_no)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sablon ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] placeholder-[#6b7280]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8892a8]" />
          <select
            value={filterDir}
            onChange={(e) => setFilterDir(e.target.value)}
            className="rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] px-3 py-2"
          >
            <option value="all">Tum Direktorlukler</option>
            {directorates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Toplam Sablon</div>
          <div className="text-2xl font-bold text-[#e2e8f0]">{templates.length}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Icerikli Sablon</div>
          <div className="text-2xl font-bold text-[#10b981]">
            {templates.filter((t) => t.content && t.content.trim().length > 0).length}
          </div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Direktorluk</div>
          <div className="text-2xl font-bold text-[#818cf8]">{directorates.length}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Vitrindeki</div>
          <div className="text-2xl font-bold text-[#00d4ff]">{activeSlots.length}</div>
        </div>
      </div>

      {/* ─── Vitrindeki Şablonlar ─── */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
        <div className="border-b border-[#0f3460]/40 px-4 py-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-sm font-bold text-[#e2e8f0]">Vitrindeki Şablonlar</h3>
          <span className="text-[10px] text-[#8892a8] ml-auto">{activeSlots.length} aktif slot</span>
        </div>
        <div className="p-4">
          {vitrinLoading ? (
            <div className="text-[#8892a8] text-sm py-4 text-center">Yükleniyor…</div>
          ) : vitrinSlots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#0f3460]/40 p-6 text-center text-[#8892a8] text-sm">
              Henüz vitrine şablon eklenmemiş. Aşağıdaki listeden şablon seçip &quot;Vitrine Yerleştir&quot; butonuna tıklayın.
            </div>
          ) : (
            <div className="space-y-2">
              {vitrinSlots
                .sort((a, b) => a.sira_no - b.sira_no)
                .map((slot) => {
                  const activeIdx = activeSlots.findIndex((s) => s.id === slot.id)
                  return (
                  <div
                    key={slot.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                      slot.aktif
                        ? "border-[#0f3460]/40 bg-[#0a0e17]"
                        : "border-[#0f3460]/20 bg-[#0a0e17]/40 opacity-50"
                    }`}
                  >
                    <span className="text-xs font-mono text-[#00d4ff] w-6 text-center flex-shrink-0">
                      {slot.aktif ? slot.sira_no : "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#e2e8f0] truncate">{slot.baslik}</div>
                      {slot.onizleme_url && (
                        <div className="text-[10px] text-[#8892a8] truncate">{slot.onizleme_url}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMoveSlot(slot, "up")}
                        disabled={vitrinBusy || activeIdx <= 0 || !slot.aktif}
                        className="p-1 rounded hover:bg-[#0f3460]/30 text-[#8892a8] hover:text-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Yukarı taşı"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveSlot(slot, "down")}
                        disabled={vitrinBusy || activeIdx === activeSlots.length - 1 || activeIdx < 0 || !slot.aktif}
                        className="p-1 rounded hover:bg-[#0f3460]/30 text-[#8892a8] hover:text-[#e2e8f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Aşağı taşı"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleAktif(slot)}
                        disabled={vitrinBusy}
                        className={`p-1 rounded hover:bg-[#0f3460]/30 transition-colors ${
                          slot.aktif ? "text-[#10b981] hover:text-[#10b981]" : "text-[#f59e0b] hover:text-[#f59e0b]"
                        }`}
                        title={slot.aktif ? "Pasife al" : "Aktife al"}
                      >
                        {slot.aktif ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot)}
                        disabled={vitrinBusy}
                        className="p-1 rounded hover:bg-red-500/10 text-[#8892a8] hover:text-[#e94560] transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* Template list + detail */}
      <div className="flex gap-4 min-h-[400px]">
        {/* Left: template cards */}
        <div className={`overflow-y-auto space-y-2 ${selectedTemplate ? "w-1/2 lg:w-2/5" : "w-full"}`}>
          {loading ? (
            <div className="text-[#8892a8] text-sm py-8 text-center">Yukleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#0f3460]/40 p-8 text-center text-[#8892a8]">
              {search || filterDir !== "all"
                ? "Filtreye uygun sablon bulunamadi"
                : "Henuz sablon eklenmemis"}
            </div>
          ) : (
            filtered.map((t) => {
              const hasContent = t.content && t.content.trim().length > 0
              const color = getDirectorateColor(t.directorate)
              const isInVitrin = vitrinSlots.some((s) => s.sablon_id === t.id)
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`rounded-xl border p-3 transition-all cursor-pointer ${
                    selectedTemplate?.id === t.id
                      ? "border-[#00d4ff] bg-[#00d4ff]/5"
                      : "border-[#0f3460]/40 bg-[#0a0a1a]/80 hover:border-[#0f3460]/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#e2e8f0] text-sm truncate">
                        {(t.template_key ?? "").replace(/_/g, " ")}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {t.directorate && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${color}15`,
                              color,
                              borderWidth: 1,
                              borderColor: `${color}30`,
                            }}
                          >
                            {t.directorate}
                          </span>
                        )}
                        {t.category && (
                          <span className="text-[10px] text-[#8892a8]">{t.category}</span>
                        )}
                        {isInVitrin && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30">
                            Vitrinde
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8892a8] mt-1 line-clamp-2">
                        {hasContent
                          ? (t.content ?? "").slice(0, 120)
                          : "Icerik henuz eklenmemis -- duzenlemek icin tiklayin"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full ${
                          hasContent
                            ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30"
                            : "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
                        }`}
                      >
                        {hasContent ? "Hazir" : "Taslak"}
                      </span>
                      {!isInVitrin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToVitrin(t)
                          }}
                          disabled={vitrinBusy}
                          className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50"
                          title="Vitrine Yerleştir"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          Vitrine Yerleştir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right: detail panel */}
        {selectedTemplate && (
          <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/90 overflow-hidden">
            <div className="border-b border-[#0f3460]/40 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#e2e8f0]">
                  {(selectedTemplate.template_key ?? "").replace(/_/g, " ")}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {selectedTemplate.directorate && (
                    <span
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${getDirectorateColor(selectedTemplate.directorate)}15`,
                        color: getDirectorateColor(selectedTemplate.directorate),
                      }}
                    >
                      {selectedTemplate.directorate}
                    </span>
                  )}
                  {selectedTemplate.category && (
                    <span className="text-[10px] text-[#8892a8]">{selectedTemplate.category}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!vitrinSlots.some((s) => s.sablon_id === selectedTemplate.id) && (
                  <button
                    onClick={() => handleAddToVitrin(selectedTemplate)}
                    disabled={vitrinBusy}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Vitrine Yerleştir
                  </button>
                )}
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-[#8892a8] hover:text-[#e2e8f0] text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-mono text-[#818cf8] mb-1">DEGISKENLER</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.variables.map((v, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20 font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-[10px] font-mono text-[#8892a8] mb-1">ICERIK</div>
              <pre className="text-sm text-[#e2e8f0] whitespace-pre-wrap font-sans leading-relaxed bg-[#111827]/50 rounded-lg p-3 border border-[#2a3650]">
                {renderContentPreview(selectedTemplate)}
              </pre>
              {selectedTemplate.updated_at && (
                <div className="text-[10px] text-[#8892a8] mt-3">
                  Son guncelleme:{" "}
                  {new Date(selectedTemplate.updated_at).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== SABLON MAGAZASI TAB ====================

function SablonMagazasiTab() {
  const [storeTemplates, setStoreTemplates] = useState<StoreTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [priceFilter, setPriceFilter] = useState<string>("all")
  const [selectedStore, setSelectedStore] = useState<StoreTemplate | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [robotQuery, setRobotQuery] = useState("")
  const [robotLoading, setRobotLoading] = useState(false)
  const [robotResults, setRobotResults] = useState<StoreTemplate[] | null>(null)
  const [robotMessage, setRobotMessage] = useState("")

  const fetchStore = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== "all") params.set("category", category)
      if (search) params.set("search", search)
      if (priceFilter !== "all") params.set("price", priceFilter)
      const res = await fetch(`/api/templates/store?${params.toString()}`)
      const json = await res.json()
      setStoreTemplates(json.data ?? [])
    } catch {
      setStoreTemplates([])
    } finally {
      setLoading(false)
    }
  }, [category, search, priceFilter])

  useEffect(() => {
    fetchStore()
  }, [fetchStore])

  const handleInstall = async (template: StoreTemplate) => {
    setInstalling(template.id)
    try {
      const res = await fetch("/api/templates/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", template_id: template.id }),
      })
      const json = await res.json()
      if (json.success) {
        setInstalledIds((prev) => new Set([...prev, template.id]))
      }
    } catch {
      // silent
    } finally {
      setInstalling(null)
    }
  }

  const handleRobotSearch = async () => {
    if (!robotQuery.trim()) return
    setRobotLoading(true)
    setRobotResults(null)
    setRobotMessage("")
    try {
      const res = await fetch("/api/templates/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "robot_search", robot_query: robotQuery }),
      })
      const json = await res.json()
      setRobotResults(json.results ?? [])
      setRobotMessage(json.robot_message ?? "")
    } catch {
      setRobotMessage("Robot arama sirasinda hata olustu.")
    } finally {
      setRobotLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Robot Search Section */}
      <div className="rounded-xl border border-[#8b5cf6]/30 bg-gradient-to-r from-[#8b5cf6]/10 to-[#0a0a1a]/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-sm font-bold text-[#e2e8f0]">Piyasa Robotu</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30">
            AI Destekli
          </span>
        </div>
        <p className="text-xs text-[#8892a8] mb-3">
          Ucretsiz sablonlari otomatik olarak aratip bulun. Kategori veya anahtar kelime girin.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b5cf6]" />
            <input
              type="text"
              value={robotQuery}
              onChange={(e) => setRobotQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRobotSearch()}
              placeholder="ornegin: ucretsiz basketbol sablonu ara..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#8b5cf6]/30 bg-[#0a0e17] text-sm text-[#e2e8f0] placeholder-[#6b7280] focus:border-[#8b5cf6] focus:outline-none"
            />
          </div>
          <button
            onClick={handleRobotSearch}
            disabled={robotLoading || !robotQuery.trim()}
            className="px-4 py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {robotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            Ara
          </button>
        </div>
        {robotMessage && (
          <div className="mt-3 p-3 rounded-lg bg-[#0a0e17]/80 border border-[#8b5cf6]/20">
            <p className="text-xs text-[#8b5cf6] flex items-center gap-1">
              <Bot className="w-3 h-3" />
              {robotMessage}
            </p>
            {robotResults && robotResults.length > 0 && (
              <div className="mt-2 space-y-2">
                {robotResults.map((rt) => (
                  <div
                    key={rt.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a1a]/60 border border-[#2a3650]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#e2e8f0] font-medium truncate">{rt.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#10b981]">Ucretsiz</span>
                        <span className="text-[10px] text-[#f59e0b]">{renderStars(rt.stars)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInstall(rt)}
                      disabled={installing === rt.id || installedIds.has(rt.id)}
                      className="ml-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white flex items-center gap-1 transition-colors"
                    >
                      {installedIds.has(rt.id) ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Yuklendi
                        </>
                      ) : installing === rt.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-3 h-3" /> Yukle
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Magaza sablonlarinda ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] placeholder-[#6b7280]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8892a8]" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] px-3 py-2"
          >
            {STORE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#8892a8]" />
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] px-3 py-2"
          >
            <option value="all">Tum Fiyatlar</option>
            <option value="free">Ucretsiz</option>
            <option value="paid">Ucretli</option>
          </select>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {STORE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === c.value
                ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40"
                : "bg-[#0a0a1a]/80 text-[#8892a8] border border-[#2a3650] hover:border-[#0f3460]"
            }`}
          >
            {c.value !== "all" && CATEGORY_ICONS[c.value] ? `${CATEGORY_ICONS[c.value]} ` : ""}
            {c.label}
          </button>
        ))}
      </div>

      {/* Store Grid */}
      {loading ? (
        <div className="text-[#8892a8] text-sm py-12 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Magaza yukleniyor...
        </div>
      ) : storeTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#0f3460]/40 p-12 text-center text-[#8892a8]">
          <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Filtreye uygun sablon bulunamadi</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storeTemplates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 hover:border-[#0f3460]/60 transition-all group overflow-hidden"
            >
              {/* Card Header - Preview area */}
              <div className="relative h-32 bg-gradient-to-br from-[#0f3460]/30 to-[#0a0e17] flex items-center justify-center overflow-hidden">
                <div className="text-4xl opacity-30 group-hover:opacity-50 transition-opacity">
                  {CATEGORY_ICONS[t.category] || "📄"}
                </div>
                {/* Price badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                      t.is_free
                        ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30"
                        : "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30"
                    }`}
                  >
                    {formatPrice(t.price, t.currency)}
                  </span>
                </div>
                {/* Official badge */}
                {t.is_official && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Resmi
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-[#e2e8f0] line-clamp-1">{t.name}</h4>
                  <p className="text-xs text-[#8892a8] mt-1 line-clamp-2">{t.description}</p>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-[#f59e0b] flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" />
                    {t.stars.toFixed(1)}
                  </span>
                  <span className="text-[#8892a8] flex items-center gap-0.5">
                    <Download className="w-3 h-3" />
                    {t.downloads.toLocaleString("tr-TR")}
                  </span>
                  <span className="text-[#8892a8]">{t.author}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {t.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f3460]/20 text-[#818cf8] border border-[#0f3460]/30"
                    >
                      {tag}
                    </span>
                  ))}
                  {t.tags.length > 3 && (
                    <span className="text-[10px] text-[#8892a8]">+{t.tags.length - 3}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedStore(t)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#2a3650] bg-[#0a0e17] hover:bg-[#0f3460]/20 text-xs text-[#e2e8f0] flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Detay
                  </button>
                  <button
                    onClick={() => t.is_free ? handleInstall(t) : undefined}
                    disabled={!t.is_free || installing === t.id || installedIds.has(t.id)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                      installedIds.has(t.id)
                        ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30"
                        : t.is_free
                          ? "bg-[#10b981] hover:bg-[#059669] text-white"
                          : "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 cursor-not-allowed"
                    }`}
                  >
                    {installedIds.has(t.id) ? (
                      <>
                        <CheckCircle className="w-3 h-3" /> Yuklendi
                      </>
                    ) : installing === t.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : t.is_free ? (
                      <>
                        <Download className="w-3 h-3" /> Yukle
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> Yakin Zamanda
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Detail Dialog */}
      <TemplateDetailDialog
        template={selectedStore}
        onClose={() => setSelectedStore(null)}
        onInstall={handleInstall}
        installing={installing}
        installedIds={installedIds}
      />
    </div>
  )
}

// ==================== TEMPLATE DETAIL DIALOG ====================

function TemplateDetailDialog({
  template,
  onClose,
  onInstall,
  installing,
  installedIds,
}: {
  template: StoreTemplate | null
  onClose: () => void
  onInstall: (t: StoreTemplate) => void
  installing: string | null
  installedIds: Set<string>
}) {
  if (!template) return null

  return (
    <Dialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0a0a1a] border-[#0f3460]/40 text-[#e2e8f0]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#e2e8f0]">
            <span className="text-xl">
              {CATEGORY_ICONS[template.category] || "📄"}
            </span>
            {template.name}
          </DialogTitle>
          <DialogDescription className="text-[#8892a8]">
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview area */}
          <div className="rounded-lg border border-[#2a3650] overflow-hidden">
            <div className="bg-[#0f3460]/10 px-3 py-2 border-b border-[#2a3650] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8892a8]">Onizleme</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              </div>
            </div>
            <div className="h-48 bg-gradient-to-br from-[#0f3460]/20 to-[#0a0e17] flex items-center justify-center">
              {template.preview_url ? (
                <iframe
                  src={template.preview_url}
                  className="w-full h-full border-0"
                  title={`${template.name} onizleme`}
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="text-center">
                  <div className="text-5xl opacity-30 mb-2">
                    {CATEGORY_ICONS[template.category] || "📄"}
                  </div>
                  <p className="text-xs text-[#8892a8]">
                    Canli onizleme yakin zamanda eklenecek
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-3">
              <div className="text-[10px] text-[#8892a8] mb-1">Fiyat</div>
              <div className={`text-lg font-bold ${template.is_free ? "text-[#10b981]" : "text-[#f59e0b]"}`}>
                {formatPrice(template.price, template.currency)}
              </div>
            </div>
            <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-3">
              <div className="text-[10px] text-[#8892a8] mb-1">Degerlendirme</div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-[#f59e0b] fill-current" />
                <span className="text-lg font-bold text-[#e2e8f0]">{template.stars.toFixed(1)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-3">
              <div className="text-[10px] text-[#8892a8] mb-1">Indirilme</div>
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-lg font-bold text-[#e2e8f0]">{template.downloads.toLocaleString("tr-TR")}</span>
              </div>
            </div>
            <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-3">
              <div className="text-[10px] text-[#8892a8] mb-1">Yayinci</div>
              <div className="flex items-center gap-1">
                {template.is_official && <CheckCircle className="w-4 h-4 text-[#00d4ff]" />}
                <span className="text-sm font-medium text-[#e2e8f0]">{template.author}</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-bold text-[#e2e8f0] mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#8b5cf6]" />
              Ozellikler
            </h4>
            <div className="space-y-1.5">
              {template.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#8892a8]">
                  <ArrowRight className="w-3 h-3 text-[#10b981] mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#0f3460]/20 text-[#818cf8] border border-[#0f3460]/30"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#2a3650] bg-transparent text-[#8892a8] hover:text-[#e2e8f0] hover:bg-[#0f3460]/20"
          >
            Kapat
          </Button>
          <Button
            onClick={() => template.is_free ? onInstall(template) : undefined}
            disabled={!template.is_free || installing === template.id || installedIds.has(template.id)}
            className={
              installedIds.has(template.id)
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/30"
                : template.is_free
                  ? "bg-[#10b981] hover:bg-[#059669] text-white"
                  : "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30 cursor-not-allowed"
            }
          >
            {installedIds.has(template.id) ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" /> Yuklendi
              </>
            ) : installing === template.id ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Yukleniyor...
              </>
            ) : template.is_free ? (
              <>
                <Download className="w-4 h-4 mr-1" /> Kullan (Yukle)
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-1" /> Satin Al - Yakin Zamanda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== MAIN PAGE ====================

export default function SablonHavuzuPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight flex items-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-[#8b5cf6]" />
          Sablon Havuzu
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Kendi sablonlarinizi yonetin veya magazadan yeni sablonlar kesfedin
        </p>
      </div>

      <Tabs defaultValue="magazasi" className="w-full">
        <TabsList className="bg-[#0a0a1a]/80 border border-[#0f3460]/40 p-1">
          <TabsTrigger
            value="benim"
            className="data-[state=active]:bg-[#0f3460]/40 data-[state=active]:text-[#e2e8f0] text-[#8892a8]"
          >
            <LayoutTemplate className="w-4 h-4 mr-1.5" />
            Benim Sablonlarim
          </TabsTrigger>
          <TabsTrigger
            value="magazasi"
            className="data-[state=active]:bg-[#8b5cf6]/30 data-[state=active]:text-[#e2e8f0] text-[#8892a8]"
          >
            <Store className="w-4 h-4 mr-1.5" />
            Sablon Magazasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benim">
          <BenimSablonlarimTab />
        </TabsContent>

        <TabsContent value="magazasi">
          <SablonMagazasiTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
