/**
 * Dashboard widget konfigürasyonu
 * localStorage: dashboard_widget_prefs → { order: string[], visible: Record<string, boolean> }
 */

export const WIDGET_IDS = ["token", "robotStatus", "onaySayisi", "gorevler", "apiMaliyet"] as const
export type WidgetId = (typeof WIDGET_IDS)[number]

export const WIDGET_LABELS: Record<WidgetId, string> = {
  token: "Token / Maliyet",
  robotStatus: "Robot Durum",
  onaySayisi: "Onay Sayısı",
  gorevler: "Başlangıç Görevleri",
  apiMaliyet: "API Maliyet",
}

const STORAGE_KEY = "dashboard_widget_prefs"

export interface WidgetPrefs {
  order: string[]
  visible: Record<string, boolean>
}

const defaultPrefs: WidgetPrefs = {
  order: [...WIDGET_IDS],
  visible: Object.fromEntries(WIDGET_IDS.map((id) => [id, true])),
}

export function getWidgetPrefs(): WidgetPrefs {
  if (typeof window === "undefined") return defaultPrefs
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPrefs
    const parsed = JSON.parse(raw) as Partial<WidgetPrefs>
    return {
      order: parsed.order ?? defaultPrefs.order,
      visible: { ...defaultPrefs.visible, ...parsed.visible },
    }
  } catch {
    return defaultPrefs
  }
}

export function setWidgetPrefs(prefs: WidgetPrefs): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}
