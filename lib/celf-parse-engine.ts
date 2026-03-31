import { DIRECTORATE_KEYWORDS } from "./celf-directorate-config"

const ALL_DIRECTORATES = Object.keys(DIRECTORATE_KEYWORDS)
const MIN_SELECT = 2
const MAX_SELECT = 6

/**
 * Görev başlık + açıklamasına göre ilgili direktörlükleri seçer.
 * - Keyword eşleşme skoru > 0 olanlar
 * - CFO her zaman dahil (token takibi)
 * - En az 2, en fazla 6 direktörlük
 * - Hiç eşleşme yoksa 12'si (fallback)
 */
export function selectDirectorates(title: string, description: string): string[] {
  const text = `${title ?? ""} ${description ?? ""}`.toLowerCase().trim()
  if (!text) return ALL_DIRECTORATES

  const scores: Record<string, number> = {}
  for (const code of ALL_DIRECTORATES) {
    scores[code] = 0
    const keywords = DIRECTORATE_KEYWORDS[code] ?? []
    for (const kw of keywords) {
      if (kw.length < 2) continue
          if (text.includes(kw.toLowerCase())) scores[code]++
    }
  }

  const withScore = ALL_DIRECTORATES.filter((code) => scores[code] > 0)
  const selected = new Set<string>()

  selected.add("CFO")

  if (withScore.length === 0) {
    const rest = ALL_DIRECTORATES.filter((c) => !selected.has(c))
    for (let i = 0; selected.size < MIN_SELECT && i < rest.length; i++) selected.add(rest[i])
    return Array.from(selected)
  }

  const byScore = [...ALL_DIRECTORATES].sort((a, b) => scores[b] - scores[a])
  for (const code of byScore) {
    if (selected.size >= MAX_SELECT) break
    if (scores[code] > 0) selected.add(code)
  }

  if (selected.size < MIN_SELECT) {
    for (const code of byScore) {
      if (selected.size >= MIN_SELECT) break
      selected.add(code)
    }
  }

  return Array.from(selected)
}
