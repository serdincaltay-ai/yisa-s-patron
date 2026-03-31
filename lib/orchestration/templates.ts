/**
 * YİSA-S Hazır Orkestrasyon Zincir Şablonları
 *
 * Patron'un doğal dildeki komutlarına göre otomatik seçilen
 * çoklu ajan pipeline'ları.
 */

import type { OrchestrationChain } from "./types"

/** tasarim_uret: Gemini(brief) → Fal(görsel) → V0(UI) → Cursor(kod) */
export const TASARIM_URET_CHAIN: OrchestrationChain = {
  chain_id: "tasarim_uret",
  name: "Tasarım Üret",
  description: "Gemini brief yazar, Fal görsel üretir, V0 UI şablonu oluşturur, Cursor kodu yazar",
  steps: [
    {
      step_id: "brief",
      agent_id: "gemini",
      input_from: null,
      prompt_template:
        "Sen bir üst düzey tasarım direktörüsün. Aşağıdaki talep için detaylı bir tasarım brief'i hazırla. " +
        "Brief şunları içermeli: renk paleti, tipografi, layout yapısı, bileşen listesi, kullanıcı deneyimi notları.\n\n" +
        "Talep: {{input}}",
      output_type: "text",
      label: "Tasarım Brief (Gemini)",
    },
    {
      step_id: "gorsel",
      agent_id: "fal",
      input_from: "brief",
      prompt_template:
        "Professional UI mockup, modern product interface design, clean layout. " +
        "Use the visual direction and component hierarchy from the brief. " +
        "Based on this brief: {{input}}",
      output_type: "image",
      label: "Görsel Üretim (Fal AI)",
    },
    {
      step_id: "ui_sablon",
      agent_id: "v0",
      input_from: "brief",
      prompt_template:
        "Bu tasarım brief'ine gore Next.js + Tailwind CSS ile bir UI sablonu olustur. " +
        "Bilesen hiyerarsisi net, tekrar kullanilabilir ve production odakli olsun.\n\n{{input}}",
      output_type: "ui",
      label: "UI Şablon (V0)",
    },
    {
      step_id: "kod",
      agent_id: "cursor",
      input_from: "ui_sablon",
      prompt_template:
        "Aşağıdaki UI şablonunu production-ready Next.js koduna çevir. " +
        "TypeScript, Tailwind CSS ve Radix UI kullan:\n\n{{input}}",
      output_type: "code",
      label: "Kod Yazım (Cursor)",
    },
  ],
}

/** icerik_uret: GPT(metin) → Fal(görsel) → GitHub(commit) */
export const ICERIK_URET_CHAIN: OrchestrationChain = {
  chain_id: "icerik_uret",
  name: "İçerik Üret",
  description: "GPT metin yazar, Fal görsel üretir, GitHub'a commit atar",
  steps: [
    {
      step_id: "metin",
      agent_id: "gpt",
      input_from: null,
      prompt_template:
        "Sen bir içerik editörüsün. Aşağıdaki konu için profesyonel bir içerik yaz. " +
        "SEO uyumlu, akıcı ve bilgilendirici olsun. Markdown formatında yaz.\n\n" +
        "Konu: {{input}}",
      output_type: "text",
      label: "İçerik Yazım (GPT)",
    },
    {
      step_id: "gorsel",
      agent_id: "fal",
      input_from: "metin",
      prompt_template:
        "Professional blog header image, modern minimalist style. Topic: {{input}}",
      output_type: "image",
      label: "Görsel Üretim (Fal AI)",
    },
    {
      step_id: "commit",
      agent_id: "github",
      input_from: "metin",
      prompt_template:
        "Bu içeriği GitHub repository'sine commit et:\n\n{{input}}",
      output_type: "url",
      label: "GitHub Commit",
    },
  ],
}

/** video_uret: Gemini(senaryo) → Fal(video) */
export const VIDEO_URET_CHAIN: OrchestrationChain = {
  chain_id: "video_uret",
  name: "Video Üret",
  description: "Gemini senaryo yazar, Fal video üretir",
  steps: [
    {
      step_id: "senaryo",
      agent_id: "gemini",
      input_from: null,
      prompt_template:
        "Sen bir video senaristi/yönetmenisin. Aşağıdaki konu için kısa bir video senaryosu yaz. " +
        "Sahne açıklamaları, görsel yönlendirmeler ve metin içersin.\n\n" +
        "Konu: {{input}}",
      output_type: "text",
      label: "Senaryo Yazım (Gemini)",
    },
    {
      step_id: "video",
      agent_id: "fal",
      input_from: "senaryo",
      prompt_template:
        "Professional short video, cinematic quality. Based on this script: {{input}}",
      output_type: "video",
      label: "Video Üretim (Fal AI)",
    },
  ],
}

/** Tüm hazır zincir şablonları */
export const CHAIN_TEMPLATES: OrchestrationChain[] = [
  TASARIM_URET_CHAIN,
  ICERIK_URET_CHAIN,
  VIDEO_URET_CHAIN,
]

/** chain_id ile şablon bul */
export function getChainTemplate(chainId: string): OrchestrationChain | undefined {
  return CHAIN_TEMPLATES.find((c) => c.chain_id === chainId)
}

/**
 * Kullanıcı komutuna göre en uygun zinciri otomatik seç.
 * Anahtar kelime eşleştirmesi ile çalışır.
 */
export function detectChainFromCommand(command: string): OrchestrationChain | null {
  const lower = command.toLocaleLowerCase("tr")

  // Tasarım zinciri anahtar kelimeleri
  const tasarimKeys = [
    "tasarım", "tasarim", "design", "ui", "arayüz", "arayuz",
    "mockup", "şablon", "sablon", "layout", "sayfa tasarla",
    "bileşen", "bilesen", "component",
  ]
  if (tasarimKeys.some((k) => lower.includes(k))) return TASARIM_URET_CHAIN

  // Video zinciri anahtar kelimeleri
  const videoKeys = [
    "video", "senaryo", "animasyon", "clip", "reel", "kısa film",
    "tanıtım filmi", "tanitim filmi", "video üret", "video uret",
  ]
  if (videoKeys.some((k) => lower.includes(k))) return VIDEO_URET_CHAIN

  // İçerik zinciri anahtar kelimeleri
  const icerikKeys = [
    "içerik", "icerik", "blog", "makale", "yazı", "yazi",
    "content", "post", "metin", "haber", "duyuru",
  ]
  if (icerikKeys.some((k) => lower.includes(k))) return ICERIK_URET_CHAIN

  return null
}
