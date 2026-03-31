/**
 * Beyin Takımı — 4 robot tanımı.
 * CIO/CEO/COO kullanılmaz. AI karar almaz, öneri sunar.
 */
export const BEYIN_ROBOTS = [
  {
    id: "celf",
    name: "CELF",
    memberId: "claude" as const,
    engine: "Claude Sonnet",
    color: "#e94560",
    bgColor: "rgba(233,69,96,0.1)",
    avatar: "C",
  },
  {
    id: "veri",
    name: "Veri Robotu",
    memberId: "gemini" as const,
    engine: "Gemini",
    color: "#00d4ff",
    bgColor: "rgba(0,212,255,0.1)",
    avatar: "V",
  },
  {
    id: "guvenlik",
    name: "Güvenlik Robotu",
    memberId: "gpt" as const,
    engine: "GPT-4o",
    color: "#ffa500",
    bgColor: "rgba(255,165,0,0.1)",
    avatar: "G",
  },
  {
    id: "yisas",
    name: "YİSA-S Robotu",
    memberId: "together" as const,
    engine: "GPT-4o-mini",
    color: "#7b68ee",
    bgColor: "rgba(123,104,238,0.1)",
    avatar: "Y",
  },
] as const

export type BeyinMode = "tekli" | "coklu" | "zincir" | "hepsi"

export const BEYIN_MODES: { value: BeyinMode; label: string }[] = [
  { value: "tekli", label: "Tekli" },
  { value: "coklu", label: "Çoklu" },
  { value: "zincir", label: "Zincir" },
  { value: "hepsi", label: "Hepsi" },
]
