"use client"

import { useState } from "react"
import {
  X,
  Heart,
  ShoppingCart,
  Star,
  Eye,
  Download,
  Sparkles,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
} from "lucide-react"

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

const CATEGORY_ICONS: Record<string, string> = {
  tesis_tanitim: "🏟️",
  ders_programi: "📅",
  sporcu_degerlendirme: "🏅",
  veli_bilgilendirme: "👨‍👩‍👧",
  finansal_rapor: "📊",
  sosyal_medya: "📱",
  rapor: "📄",
  dashboard: "📈",
  ui: "🎨",
  email: "📧",
  bildirim: "🔔",
  genel: "📝",
}

const CATEGORY_LABELS: Record<string, string> = {
  tesis_tanitim: "Tesis Tanitim",
  ders_programi: "Ders Programi",
  sporcu_degerlendirme: "Sporcu Degerlendirme",
  veli_bilgilendirme: "Veli Bilgilendirme",
  finansal_rapor: "Finansal Rapor",
  sosyal_medya: "Sosyal Medya",
  rapor: "Rapor",
  dashboard: "Dashboard",
  ui: "UI Sablon",
  email: "Email",
  bildirim: "Bildirim",
  genel: "Genel",
}

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

const MOCK_PREVIEW_CONTENT: Record<string, string> = {
  tesis_tanitim: `
<div style="font-family: system-ui; padding: 24px; background: linear-gradient(135deg, #0a0a1a 0%, #0f3460 100%); color: #e2e8f0; border-radius: 12px;">
  <h1 style="font-size: 28px; margin-bottom: 8px; color: #00d4ff;">🏟️ YiSA-S Spor Akademisi</h1>
  <p style="color: #8892a8; font-size: 14px;">Profesyonel spor egitimi ve gelisim merkezi</p>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 20px;">
    <div style="background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); border-radius: 8px; padding: 16px; text-align: center;">
      <div style="font-size: 24px; font-weight: bold; color: #00d4ff;">250+</div>
      <div style="font-size: 11px; color: #8892a8;">Aktif Sporcu</div>
    </div>
    <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 16px; text-align: center;">
      <div style="font-size: 24px; font-weight: bold; color: #10b981;">12</div>
      <div style="font-size: 11px; color: #8892a8;">Uzman Antrenor</div>
    </div>
    <div style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 16px; text-align: center;">
      <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">8</div>
      <div style="font-size: 11px; color: #8892a8;">Brans</div>
    </div>
  </div>
</div>`,
  ders_programi: `
<div style="font-family: system-ui; padding: 24px; background: #0a0a1a; color: #e2e8f0; border-radius: 12px;">
  <h2 style="font-size: 18px; margin-bottom: 16px; color: #10b981;">📅 Haftalik Ders Programi</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
    <thead><tr style="border-bottom: 1px solid #0f3460;">
      <th style="padding: 8px; text-align: left; color: #8892a8;">Saat</th>
      <th style="padding: 8px; text-align: left; color: #8892a8;">Pzt</th>
      <th style="padding: 8px; text-align: left; color: #8892a8;">Sal</th>
      <th style="padding: 8px; text-align: left; color: #8892a8;">Car</th>
    </tr></thead>
    <tbody>
      <tr style="border-bottom: 1px solid #0f3460/20;"><td style="padding: 8px; color: #00d4ff;">09:00</td><td style="padding: 8px;">Jimnastik A</td><td style="padding: 8px;">Yuzme</td><td style="padding: 8px;">Jimnastik B</td></tr>
      <tr style="border-bottom: 1px solid #0f3460/20;"><td style="padding: 8px; color: #00d4ff;">10:30</td><td style="padding: 8px;">Basketbol</td><td style="padding: 8px;">Voleybol</td><td style="padding: 8px;">Futsal</td></tr>
      <tr><td style="padding: 8px; color: #00d4ff;">14:00</td><td style="padding: 8px;">Pilates</td><td style="padding: 8px;">Yoga</td><td style="padding: 8px;">Fitness</td></tr>
    </tbody>
  </table>
</div>`,
  finansal_rapor: `
<div style="font-family: system-ui; padding: 24px; background: #0a0a1a; color: #e2e8f0; border-radius: 12px;">
  <h2 style="font-size: 18px; margin-bottom: 16px; color: #10b981;">📊 Aylik Finansal Ozet</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 16px;">
      <div style="font-size: 11px; color: #8892a8;">Toplam Gelir</div>
      <div style="font-size: 22px; font-weight: bold; color: #10b981;">₺ 285.000</div>
    </div>
    <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 16px;">
      <div style="font-size: 11px; color: #8892a8;">Toplam Gider</div>
      <div style="font-size: 22px; font-weight: bold; color: #ef4444;">₺ 142.500</div>
    </div>
    <div style="background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); border-radius: 8px; padding: 16px;">
      <div style="font-size: 11px; color: #8892a8;">Net Kar</div>
      <div style="font-size: 22px; font-weight: bold; color: #00d4ff;">₺ 142.500</div>
    </div>
    <div style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 8px; padding: 16px;">
      <div style="font-size: 11px; color: #8892a8;">Uye Sayisi</div>
      <div style="font-size: 22px; font-weight: bold; color: #f59e0b;">342</div>
    </div>
  </div>
</div>`,
  sosyal_medya: `
<div style="font-family: system-ui; padding: 24px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #e2e8f0; border-radius: 12px;">
  <h2 style="font-size: 18px; margin-bottom: 4px; color: #8b5cf6;">📱 Sosyal Medya Plani</h2>
  <p style="font-size: 12px; color: #8892a8; margin-bottom: 16px;">Bu haftanin icerik takvimi</p>
  <div style="space-y: 8px;">
    <div style="background: rgba(139,92,246,0.1); border-left: 3px solid #8b5cf6; padding: 12px; border-radius: 0 8px 8px 0; margin-bottom: 8px;">
      <div style="font-size: 11px; color: #8b5cf6; font-weight: bold;">Pazartesi</div>
      <div style="font-size: 13px;">Sporcu basari hikayesi paylasimi</div>
    </div>
    <div style="background: rgba(0,212,255,0.1); border-left: 3px solid #00d4ff; padding: 12px; border-radius: 0 8px 8px 0; margin-bottom: 8px;">
      <div style="font-size: 11px; color: #00d4ff; font-weight: bold;">Carsamba</div>
      <div style="font-size: 13px;">Yeni ders programi duyurusu</div>
    </div>
    <div style="background: rgba(16,185,129,0.1); border-left: 3px solid #10b981; padding: 12px; border-radius: 0 8px 8px 0;">
      <div style="font-size: 11px; color: #10b981; font-weight: bold;">Cuma</div>
      <div style="font-size: 13px;">Hafta sonu etkinlik tanitimi</div>
    </div>
  </div>
</div>`,
}

function getDefaultPreview(category: string): string {
  return MOCK_PREVIEW_CONTENT[category] ?? MOCK_PREVIEW_CONTENT.tesis_tanitim ?? ""
}

export default function SablonOnizleme({
  template,
  onClose,
  onFavorite,
  isFavorite,
}: {
  template: GalleryTemplate | null
  onClose: () => void
  onFavorite: (id: string) => void
  isFavorite: boolean
}) {
  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [buying, setBuying] = useState(false)
  const [bought, setBought] = useState(false)
  const [buyError, setBuyError] = useState<string | null>(null)

  if (!template) return null

  const stars = template.stars ?? 4.5
  const downloads = template.downloads ?? 500
  const price = template.price ?? 0
  const icon = CATEGORY_ICONS[template.category] ?? "📄"
  const label = CATEGORY_LABELS[template.category] ?? template.category
  const dirColor = template.directorate
    ? DIRECTORATE_COLORS[template.directorate] ?? "#8892a8"
    : null

  const handleGenerateContent = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch("/api/ai/sablon-icerik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: template.name,
          category: template.category,
          description: template.description,
          directorate: template.directorate,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAiError(json.error ?? "AI icerik uretimi basarisiz")
      } else {
        setAiContent(json.content)
      }
    } catch {
      setAiError("Baglanti hatasi")
    } finally {
      setAiLoading(false)
    }
  }

  const handleCopy = () => {
    const text = aiContent ?? template.description
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleBuy = async () => {
    setBuying(true)
    setBuyError(null)
    try {
      const res = await fetch("/api/templates/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "install", template_id: template.id }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setBought(true)
      } else {
        setBuyError(json.error ?? "Sablon eklenemedi. Daha sonra tekrar deneyin.")
      }
    } catch {
      setBuyError("Baglanti hatasi")
    } finally {
      setBuying(false)
    }
  }

  const previewHtml = getDefaultPreview(template.category)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a1a] border border-[#0f3460]/60 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#0f3460]/40 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{icon}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#e2e8f0] truncate">{template.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0f3460]/30 text-[#8892a8]">
                  {label}
                </span>
                {template.directorate && dirColor && (
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${dirColor}15`,
                      color: dirColor,
                      border: `1px solid ${dirColor}30`,
                    }}
                  >
                    {template.directorate}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onFavorite(template.id)}
              className="p-2 rounded-lg hover:bg-[#0f3460]/30 transition-colors"
              title="Favorilere Ekle"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? "text-[#e94560] fill-[#e94560]" : "text-[#8892a8] hover:text-[#e94560]"
                }`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#0f3460]/30 transition-colors text-[#8892a8] hover:text-[#e2e8f0]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0">
            {/* Left: Preview */}
            <div className="border-b md:border-b-0 md:border-r border-[#0f3460]/30">
              {/* Browser chrome */}
              <div className="bg-[#0f3460]/10 px-3 py-2 border-b border-[#0f3460]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  </div>
                  <span className="text-[10px] font-mono text-[#8892a8] ml-2">
                    sablon-onizleme.yisa-s.com
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded hover:bg-[#0f3460]/30 text-[#8892a8]">
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {/* Preview content */}
              <div className="p-4 min-h-[280px]">
                {previewHtml ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                    className="rounded-lg overflow-hidden"
                  />
                ) : (
                  <div className="h-64 bg-gradient-to-br from-[#0f3460]/20 to-[#0a0e17] flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <span className="text-6xl opacity-30">{icon}</span>
                      <p className="text-xs text-[#8892a8] mt-2">Canli onizleme yakin zamanda</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Info + AI */}
            <div className="p-4 space-y-4">
              {/* Description */}
              <div>
                <p className="text-sm text-[#8892a8] leading-relaxed">{template.description}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-2.5 text-center">
                  <Star className="w-4 h-4 text-[#f59e0b] fill-[#f59e0b] mx-auto" />
                  <div className="text-sm font-bold text-[#e2e8f0] mt-1">{stars.toFixed(1)}</div>
                  <div className="text-[9px] text-[#8892a8]">Puan</div>
                </div>
                <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-2.5 text-center">
                  <Eye className="w-4 h-4 text-[#00d4ff] mx-auto" />
                  <div className="text-sm font-bold text-[#e2e8f0] mt-1">{downloads.toLocaleString("tr-TR")}</div>
                  <div className="text-[9px] text-[#8892a8]">Goruntuleme</div>
                </div>
                <div className="rounded-lg border border-[#2a3650] bg-[#0a0e17] p-2.5 text-center">
                  <Download className="w-4 h-4 text-[#10b981] mx-auto" />
                  <div className="text-sm font-bold text-[#e2e8f0] mt-1">
                    {price === 0 ? "Ucretsiz" : `${price}₺`}
                  </div>
                  <div className="text-[9px] text-[#8892a8]">Fiyat</div>
                </div>
              </div>

              {/* AI Content Generation */}
              <div className="rounded-xl border border-[#8b5cf6]/30 bg-gradient-to-br from-[#8b5cf6]/5 to-transparent p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                  <span className="text-xs font-bold text-[#e2e8f0]">AI Icerik Uretimi</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30">
                    Gemini
                  </span>
                </div>
                <p className="text-[11px] text-[#8892a8] mb-2">
                  Bu sablon icin AI ile otomatik icerik uretin
                </p>
                <button
                  onClick={handleGenerateContent}
                  disabled={aiLoading}
                  className="w-full py-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uretiyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Icerik Uret
                    </>
                  )}
                </button>
                {aiError && (
                  <p className="text-xs text-[#e94560] mt-2">{aiError}</p>
                )}
                {aiContent && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-[#8b5cf6]">URETILEN ICERIK</span>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[10px] text-[#8892a8] hover:text-[#e2e8f0] transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-[#10b981]" />
                            Kopyalandi
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Kopyala
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs text-[#e2e8f0] whitespace-pre-wrap font-sans leading-relaxed bg-[#111827]/60 rounded-lg p-3 border border-[#2a3650] max-h-48 overflow-y-auto">
                      {aiContent}
                    </pre>
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="text-[10px] text-[#8892a8] space-y-1">
                <div>
                  Olusturulma: {new Date(template.created_at).toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div>Tier: {template.tier}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#0f3460]/40 flex-shrink-0 bg-[#0a0a1a]/95">
          <button
            onClick={() => onFavorite(template.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFavorite
                ? "bg-[#e94560]/10 text-[#e94560] border border-[#e94560]/30"
                : "bg-[#0f3460]/20 text-[#8892a8] border border-[#2a3650] hover:text-[#e2e8f0]"
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-[#e94560]" : ""}`} />
            {isFavorite ? "Favorilerde" : "Favorilere Ekle"}
          </button>
          {buyError && (
            <span className="text-xs text-[#e94560] mr-2">{buyError}</span>
          )}
          <button
            onClick={handleBuy}
            disabled={buying || bought}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              bought
                ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30"
                : "bg-[#00d4ff] hover:bg-[#00b4d8] text-white disabled:opacity-50"
            }`}
          >
            {bought ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Eklendi
              </>
            ) : buying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ekleniyor...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                {price === 0 ? "Ucretsiz Ekle" : `Satin Al — ${price}₺`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
