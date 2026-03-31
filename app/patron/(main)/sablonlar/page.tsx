"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  Filter,
  Star,
  Heart,
  ShoppingCart,
  Sparkles,
  LayoutGrid,
  List,
  Loader2,
  Eye,
  Tag,
  ImageIcon,
} from "lucide-react"
import SablonOnizleme from "@/components/sablon-onizleme"

// ==================== TYPES ====================

type GalleryTemplate = {
  id: string
  name: string
  description: string
  category: string
  tier: string
  directorate: string | null
  created_at: string
  price?: number
  stars?: number
  downloads?: number
  thumbnail?: string | null
}

// ==================== CONSTANTS ====================

const CATEGORIES = [
  { value: "all", label: "Tumu", icon: "📋" },
  { value: "tesis_tanitim", label: "Tesis Tanitim", icon: "🏟️" },
  { value: "ders_programi", label: "Ders Programi", icon: "📅" },
  { value: "sporcu_degerlendirme", label: "Sporcu Degerlendirme", icon: "🏅" },
  { value: "veli_bilgilendirme", label: "Veli Bilgilendirme", icon: "👨‍👩‍👧" },
  { value: "finansal_rapor", label: "Finansal Rapor", icon: "📊" },
  { value: "sosyal_medya", label: "Sosyal Medya", icon: "📱" },
  { value: "rapor", label: "Rapor", icon: "📄" },
  { value: "dashboard", label: "Dashboard", icon: "📈" },
  { value: "ui", label: "UI Sablon", icon: "🎨" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "bildirim", label: "Bildirim", icon: "🔔" },
  { value: "genel", label: "Genel", icon: "📝" },
]

const PRICE_FILTERS = [
  { value: "all", label: "Tum Fiyatlar" },
  { value: "free", label: "Ucretsiz" },
  { value: "paid", label: "Ucretli" },
]

const SORT_OPTIONS = [
  { value: "newest", label: "En Yeni" },
  { value: "popular", label: "En Populer" },
  { value: "name_asc", label: "A-Z" },
  { value: "name_desc", label: "Z-A" },
]

const DIRECTORATE_COLORS: Record<string, string> = {
  CTO: "#3b82f6",
  CFO: "#10b981",
  CMO: "#f59e0b",
  CPO: "#8b5cf6",
  CLO: "#ef4444",
  CHRO: "#ec4899",
  CSPO: "#06b6d4",
  CSO_STRATEJI: "#818cf8",
  CISO: "#e94560",
  CDO: "#a855f7",
  CCO: "#f97316",
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  tesis_tanitim: "from-blue-500/20 to-cyan-500/20",
  ders_programi: "from-green-500/20 to-emerald-500/20",
  sporcu_degerlendirme: "from-amber-500/20 to-yellow-500/20",
  veli_bilgilendirme: "from-pink-500/20 to-rose-500/20",
  finansal_rapor: "from-emerald-500/20 to-teal-500/20",
  sosyal_medya: "from-purple-500/20 to-violet-500/20",
  rapor: "from-slate-500/20 to-gray-500/20",
  dashboard: "from-indigo-500/20 to-blue-500/20",
  ui: "from-fuchsia-500/20 to-pink-500/20",
  email: "from-sky-500/20 to-blue-500/20",
  bildirim: "from-orange-500/20 to-amber-500/20",
  genel: "from-gray-500/20 to-slate-500/20",
}

function getCategoryIcon(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.icon ?? "📄"
}

function getCategoryGradient(cat: string): string {
  return CATEGORY_GRADIENTS[cat] ?? "from-gray-500/20 to-slate-500/20"
}

// Deterministic pseudo-random from template ID (no jitter on re-render)
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function stableStars(id: string): number {
  return 3.5 + (hashId(id) % 15) / 10 // 3.5 – 4.9
}

function stableDownloads(id: string): number {
  return 100 + (hashId(id + "dl") % 1900) // 100 – 1999
}

// ==================== TEMPLATE CARD ====================

function TemplateCard({
  template,
  onPreview,
  onFavorite,
  isFavorite,
}: {
  template: GalleryTemplate
  onPreview: (t: GalleryTemplate) => void
  onFavorite: (id: string) => void
  isFavorite: boolean
}) {
  const stars = template.stars ?? stableStars(template.id)
  const downloads = template.downloads ?? stableDownloads(template.id)
  const price = template.price ?? 0

  return (
    <div className="group rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden hover:border-[#00d4ff]/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,212,255,0.08)]">
      {/* Thumbnail / Preview Area */}
      <div
        className={`relative h-40 bg-gradient-to-br ${getCategoryGradient(template.category)} flex items-center justify-center cursor-pointer`}
        onClick={() => onPreview(template)}
      >
        <div className="text-5xl opacity-40 group-hover:opacity-60 transition-opacity">
          {getCategoryIcon(template.category)}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-[#00d4ff] text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Eye className="w-4 h-4" />
            Onizle
          </div>
        </div>
        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white/90 border border-white/10">
            {getCategoryIcon(template.category)} {CATEGORIES.find((c) => c.value === template.category)?.label ?? template.category}
          </span>
        </div>
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(template.id)
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/60 transition-colors"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isFavorite ? "text-[#e94560] fill-[#e94560]" : "text-white/70 hover:text-[#e94560]"
            }`}
          />
        </button>
        {/* Price badge */}
        <div className="absolute bottom-2 right-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              price === 0
                ? "bg-[#10b981]/80 text-white"
                : "bg-[#f59e0b]/80 text-white"
            }`}
          >
            {price === 0 ? "Ucretsiz" : `${price} TRY`}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3">
        <h3
          className="text-sm font-semibold text-[#e2e8f0] truncate cursor-pointer hover:text-[#00d4ff] transition-colors"
          onClick={() => onPreview(template)}
        >
          {template.name}
        </h3>
        <p className="text-xs text-[#8892a8] mt-1 line-clamp-2 min-h-[32px]">
          {template.description}
        </p>

        {/* Directorate badge */}
        {template.directorate && (
          <div className="mt-2">
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${DIRECTORATE_COLORS[template.directorate] ?? "#8892a8"}15`,
                color: DIRECTORATE_COLORS[template.directorate] ?? "#8892a8",
                border: `1px solid ${DIRECTORATE_COLORS[template.directorate] ?? "#8892a8"}30`,
              }}
            >
              {template.directorate}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#0f3460]/30">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[#f59e0b] fill-[#f59e0b]" />
            <span className="text-[10px] text-[#e2e8f0]">{stars.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-[#8892a8]" />
            <span className="text-[10px] text-[#8892a8]">{downloads.toLocaleString("tr-TR")}</span>
          </div>
          <button
            onClick={() => onPreview(template)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/20 transition-colors"
          >
            <ShoppingCart className="w-3 h-3" />
            Incele
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== TEMPLATE LIST ITEM ====================

function TemplateListItem({
  template,
  onPreview,
  onFavorite,
  isFavorite,
}: {
  template: GalleryTemplate
  onPreview: (t: GalleryTemplate) => void
  onFavorite: (id: string) => void
  isFavorite: boolean
}) {
  const stars = template.stars ?? stableStars(template.id)
  const price = template.price ?? 0

  return (
    <div
      onClick={() => onPreview(template)}
      className="flex items-center gap-4 rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3 hover:border-[#00d4ff]/40 transition-all cursor-pointer"
    >
      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${getCategoryGradient(template.category)} flex items-center justify-center flex-shrink-0`}>
        <span className="text-2xl opacity-60">{getCategoryIcon(template.category)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[#e2e8f0] truncate">{template.name}</h3>
        <p className="text-xs text-[#8892a8] truncate mt-0.5">{template.description}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {template.directorate && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${DIRECTORATE_COLORS[template.directorate] ?? "#8892a8"}15`,
                color: DIRECTORATE_COLORS[template.directorate] ?? "#8892a8",
              }}
            >
              {template.directorate}
            </span>
          )}
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-[#f59e0b] fill-[#f59e0b]" />
            <span className="text-[10px] text-[#8892a8]">{stars.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            price === 0
              ? "bg-[#10b981]/10 text-[#10b981]"
              : "bg-[#f59e0b]/10 text-[#f59e0b]"
          }`}
        >
          {price === 0 ? "Ucretsiz" : `${price} TRY`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(template.id)
          }}
          className="p-1.5 rounded-full hover:bg-[#0f3460]/30 transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorite ? "text-[#e94560] fill-[#e94560]" : "text-[#8892a8] hover:text-[#e94560]"
            }`}
          />
        </button>
      </div>
    </div>
  )
}

// ==================== MAIN GALLERY PAGE ====================

export default function SablonlarPage() {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [priceFilter, setPriceFilter] = useState("all")
  const [sort, setSort] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTemplate, setSelectedTemplate] = useState<GalleryTemplate | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yisas_sablon_favorites")
      if (saved) setFavorites(new Set(JSON.parse(saved)))
    } catch {
      // ignore
    }
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem("yisas_sablon_favorites", JSON.stringify([...next]))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  // Fetch templates from API
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (category !== "all") params.set("category", category)
    if (search) params.set("template_key", search)

    fetch(`/api/templates?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setTemplates(json.data ?? [])
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") setTemplates([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true; controller.abort() }
  }, [category, search])

  // Client-side filtering and sorting
  const filtered = templates
    .filter((t) => {
      if (priceFilter === "free") return (t.price ?? 0) === 0
      if (priceFilter === "paid") return (t.price ?? 0) > 0
      return true
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === "popular") return (b.downloads ?? 0) - (a.downloads ?? 0)
      if (sort === "name_asc") return a.name.localeCompare(b.name, "tr")
      if (sort === "name_desc") return b.name.localeCompare(a.name, "tr")
      return 0
    })

  const stats = {
    total: templates.length,
    free: templates.filter((t) => (t.price ?? 0) === 0).length,
    categories: new Set(templates.map((t) => t.category)).size,
    favorites: favorites.size,
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#00d4ff]" />
            Sablon Galerisi
          </h1>
          <p className="text-sm text-[#8892a8] mt-1">
            Gorsel galeri ile sablonlari kesfedin, canli onizleme yapin, AI ile icerik uretin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30"
                : "bg-[#0a0e17] text-[#8892a8] border border-[#2a3650] hover:text-[#e2e8f0]"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30"
                : "bg-[#0a0e17] text-[#8892a8] border border-[#2a3650] hover:text-[#e2e8f0]"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3">
          <div className="text-[10px] text-[#8892a8] uppercase tracking-wider">Toplam Sablon</div>
          <div className="text-2xl font-bold text-[#e2e8f0] mt-1">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3">
          <div className="text-[10px] text-[#8892a8] uppercase tracking-wider">Ucretsiz</div>
          <div className="text-2xl font-bold text-[#10b981] mt-1">{stats.free}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3">
          <div className="text-[10px] text-[#8892a8] uppercase tracking-wider">Kategori</div>
          <div className="text-2xl font-bold text-[#818cf8] mt-1">{stats.categories}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3">
          <div className="text-[10px] text-[#8892a8] uppercase tracking-wider">Favorilerim</div>
          <div className="text-2xl font-bold text-[#e94560] mt-1">{stats.favorites}</div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#0f3460]/40">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              category === cat.value
                ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40"
                : "bg-[#0a0e17] text-[#8892a8] border border-[#2a3650] hover:border-[#0f3460]/60 hover:text-[#e2e8f0]"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892a8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sablon adi veya aciklama ile ara..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] placeholder-[#6b7280] focus:border-[#00d4ff]/50 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#8892a8]" />
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] px-3 py-2"
          >
            {PRICE_FILTERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#8892a8]" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-[#2a3650] bg-[#0a0e17] text-sm text-[#e2e8f0] px-3 py-2"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-[#8892a8] ml-auto">
          {filtered.length} sablon
        </div>
      </div>

      {/* Gallery Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
          <span className="ml-3 text-sm text-[#8892a8]">Sablonlar yukleniyor...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#0f3460]/40 p-12 text-center">
          <Sparkles className="w-12 h-12 text-[#8892a8]/30 mx-auto mb-3" />
          <p className="text-sm text-[#8892a8]">
            {search || category !== "all" || priceFilter !== "all"
              ? "Aramanizla eslesen sablon bulunamadi. Filtreleri degistirmeyi deneyin."
              : "Henuz sablon eklenmemis."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onPreview={setSelectedTemplate}
              onFavorite={toggleFavorite}
              isFavorite={favorites.has(t.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TemplateListItem
              key={t.id}
              template={t}
              onPreview={setSelectedTemplate}
              onFavorite={toggleFavorite}
              isFavorite={favorites.has(t.id)}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <SablonOnizleme
        key={selectedTemplate?.id}
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onFavorite={toggleFavorite}
        isFavorite={selectedTemplate ? favorites.has(selectedTemplate.id) : false}
      />
    </div>
  )
}
