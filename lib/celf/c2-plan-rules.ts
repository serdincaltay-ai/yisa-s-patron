/**
 * C2 Plan — Deterministik keyword routing
 * Target + Directorate + Provider ataması
 */

export const TARGET_KEYWORDS: Record<string, string[]> = {
  website: ["vitrin", "landing", "yisa-s.com", "satış sayfası", "fuar", "sunum", "tanıtım sayfası"],
  template_pool: ["şablon", "paket", "template", "kampanya", "sms", "duyuru", "metin havuzu"],
  franchise_app: ["franchise", "veli", "yoklama", "aidat", "ders", "öğrenci", "panel"],
  central_finance: ["token", "fiyat", "lisans", "3000$", "gelir", "tahsilat", "ödeme", "kasa"],
  patron_internal: [],
}

export const DIRECTORATE_KEYWORDS: Record<string, string[]> = {
  CTO: ["kod", "api", "migration", "deploy", "bug", "performans", "veritabanı", "endpoint"],
  CFO: ["aidat", "taksit", "fiyat", "kasa", "bütçe", "maliyet", "token", "gelir"],
  CMO: ["sms", "sosyal medya", "kampanya", "reklam", "vitrin metni", "pazarlama"],
  CPO: ["ui", "form", "dashboard", "tasarım", "wizard", "panel", "sayfa"],
  CSPO: ["ders", "kapasite", "seviye", "devamsızlık", "antrenman", "spor", "gelişim"],
  CLO: ["kvkk", "sözleşme", "hukuk", "mevzuat", "yasal"],
  CISO: ["rls", "güvenlik", "audit", "yetki", "erişim", "koruma"],
  CDO: ["gelişim", "referans", "rapor", "veri", "analiz", "istatistik"],
  CHRO: ["personel", "sertifika", "rol", "ik", "işe alım"],
  CCO: ["faq", "veli bilgilendirme", "dm", "iletişim", "destek"],
  CSO: ["franchise satış", "demo", "paket", "büyüme", "strateji"],
  CRDO: ["rakip", "pazar", "trend", "araştırma", "inovasyon"],
}

export const DIRECTORATE_PROVIDER: Record<string, string> = {
  CTO: "cursor",
  CFO: "gpt",
  CMO: "gpt",
  CPO: "v0",
  CSPO: "gemini",
  CLO: "claude",
  CISO: "claude",
  CDO: "claude",
  CHRO: "gpt",
  CCO: "gpt",
  CSO: "gemini",
  CRDO: "gemini",
}

export function selectTarget(text: string): string {
  const t = (text || "").toLowerCase()
  for (const [target, keywords] of Object.entries(TARGET_KEYWORDS)) {
    if (target === "patron_internal") continue
    if (keywords.some((k) => t.includes(k))) return target
  }
  return "patron_internal"
}

export function selectDirectorates(text: string): string[] {
  const t = (text || "").toLowerCase()
  const scores: Record<string, number> = {}
  for (const [code, keywords] of Object.entries(DIRECTORATE_KEYWORDS)) {
    scores[code] = keywords.filter((k) => t.includes(k)).length
  }
  const withScore = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
  if (withScore.length === 0) return ["CTO", "CPO"]
  const max = Math.min(6, Math.max(2, withScore.length))
  return withScore.slice(0, max).map(([c]) => c)
}

export function getProviderForDirectorate(code: string): string {
  return DIRECTORATE_PROVIDER[code] || "manual"
}
