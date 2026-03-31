/**
 * CELF direktörlük → AI provider ve sistem prompt eşlemesi
 */

export const DIRECTORATE_AI_MAP: Record<string, string> = {
  CTO: "claude",
  CFO: "together",
  CMO: "gpt",
  CPO: "gpt",
  CHRO: "gpt",
  CLO: "claude",
  CSPO: "gemini",
  CCO: "gpt",
  CISO: "claude",
  CDO: "together",
  CSO: "gemini",
}

export const DIRECTORATE_DESIGN_MAP: Record<string, string> = {
  CMO: "fal_ai",
  CPO: "fal_ai",
  CSPO: "fal_ai",
}

export const DIRECTORATE_ACTION_MAP: Record<string, string[]> = {
  CTO: ["github"],
  CMO: ["manychat"],
  CPO: ["vercel"],
  CDO: ["github"],
  CISO: ["github"],
}

export const DIRECTORATE_SYSTEM_PROMPTS: Record<string, string> = {
  CTO:
    "Sen YİSA-S spor okulu yönetim sisteminin Teknik Direktörüsün. Görevleri teknik açıdan analiz et: veritabanı şeması, API endpoint, dosya yapısı öner. Yanıtını SADECE JSON formatında ver: {plan, oneriler, dosyalar, kabul_kriterleri}",
  CFO:
    "Sen YİSA-S'in Finans Direktörüsün. Maliyet analizi, fiyatlandırma, bütçe planı ve aidat şablonları üret. Yanıtını SADECE JSON formatında ver.",
  CMO:
    "Sen YİSA-S'in Pazarlama Direktörüsün. Slogan, sosyal medya metni, kampanya planı ve içerik takvimi öner. Yanıtını SADECE JSON formatında ver.",
  CPO:
    "Sen YİSA-S'in Ürün Direktörüsün. UI/UX tasarım önerisi, sayfa yapısı, kullanıcı akışı planla. Yanıtını SADECE JSON formatında ver.",
  CHRO:
    "Sen YİSA-S'in İK Direktörüsün. Personel rolleri, iş tanımları, sözleşme şablonları öner. Yanıtını SADECE JSON formatında ver.",
  CLO:
    "Sen YİSA-S'in Hukuk Direktörüsün. KVKK uyumu, franchise sözleşmesi, yasal gereklilikler belirle. Yanıtını SADECE JSON formatında ver.",
  CSPO:
    "Sen YİSA-S'in Spor Bilim Direktörüsün. Çocuk gelişim referansları, vücut tipi analizi, antrenman şablonları öner. Yanıtını SADECE JSON formatında ver.",
  CCO:
    "Sen YİSA-S'in Müşteri ve Operasyon Direktörüsün. Veli iletişimi, duyuru şablonları, destek süreçleri ve operasyon checklistleri planla. Yanıtını SADECE JSON formatında ver.",
  CISO:
    "Sen YİSA-S'in Bilgi Güvenliği Direktörüsün. 3 Duvar sistemi, RLS, erişim kontrolü, audit log belirle. Yanıtını SADECE JSON formatında ver.",
  CDO:
    "Sen YİSA-S'in Veri Direktörüsün. Referans değerler, raporlama metrikleri, dashboard verisi öner. Yanıtını SADECE JSON formatında ver.",
  CSO:
    "Sen YİSA-S'in Strateji Direktörüsün. Rakip analizi, büyüme stratejisi, yol haritası öner. Yanıtını SADECE JSON formatında ver.",
}

/** Her direktörlük için anahtar kelime listesi (akıllı parse) */
export const DIRECTORATE_KEYWORDS: Record<string, string[]> = {
  CTO: [
    "teknik", "api", "veritabanı", "supabase", "kod", "bug", "deployment", "vercel", "github",
    "sunucu", "migration", "endpoint", "frontend", "backend", "next.js", "react", "sistem",
    "mimari", "güncelle",
  ],
  CFO: [
    "muhasebe", "finans", "bütçe", "gelir", "gider", "kasa", "fatura", "maliyet", "token",
    "ödeme", "aidat", "kar", "zarar", "rapor", "taksit", "kredi", "fiyat",
  ],
  CMO: [
    "pazarlama", "reklam", "sosyal medya", "instagram", "kampanya", "içerik", "slogan",
    "tanıtım", "video", "afiş", "broşür", "fuar",
  ],
  CPO: [
    "tasarım", "ui", "ux", "logo", "renk", "tema", "şablon", "sayfa", "panel", "layout",
    "figma", "mockup", "wireframe", "gelişim paneli",
  ],
  CHRO: [
    "personel", "insan kaynakları", "ik", "maaş", "izin", "sözleşme", "işe alım", "rol",
    "kademe", "avans", "özlük", "birim", "değerlendirme",
  ],
  CLO: [
    "hukuk", "kvkk", "sözleşme", "patent", "fikri mülkiyet", "taahhüt", "protokol", "yasal",
    "mevzuat", "dava",
  ],
  CSPO: [
    "antrenman", "antrenör", "sporcu", "ölçüm", "gelişim", "referans", "branş", "jimnastik",
    "kuvvet", "esneklik", "koordinasyon", "postür", "biyomekanik", "motor beceri",
    "çocuk", "gelişim", "ölçüm", "assessment", "risk", "program", "skor", "depth", "elite", "mod",
  ],
  CCO: [
    "müşteri", "veli", "iletişim", "bildirim", "mesaj", "şikayet", "memnuniyet", "karşılama",
    "destek", "hatırlatma", "operasyon", "tesis", "ders programı", "yoklama", "envanter",
    "temizlik", "malzeme", "çalışma saatleri", "randevu",
  ],
  CISO: [
    "güvenlik", "şifre", "rls", "erişim", "yetki", "saldırı", "audit", "log", "firewall",
    "tehdit", "koruma",
  ],
  CDO: [
    "veri", "analiz", "istatistik", "grafik", "rapor", "ölçüm", "referans değer", "benchmark",
    "dashboard", "metrik", "değerlendirme",
  ],
  CSO: [
    "araştırma", "ar-ge", "inovasyon", "patent", "geliştirme", "yeni özellik", "rakip", "trend",
    "benchmark",
  ],
}
