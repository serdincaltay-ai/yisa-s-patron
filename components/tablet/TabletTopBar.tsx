"use client"

import { LayoutGrid, Wallet, Server, Building2, X } from "lucide-react"
import { useState } from "react"
import type { TabletTab } from "./TabletFrame"

const TABS: { key: TabletTab; label: string }[] = [
  { key: "ASK", label: "ASK" },
  { key: "SESSION", label: "SESSION" },
  { key: "TALEPLER", label: "TALEPLER" },
]

export default function TabletTopBar({
  activeTab,
  onTabChange,
  onOpenQuickOverlay,
}: {
  activeTab: TabletTab
  onTabChange: (tab: TabletTab) => void
  onOpenQuickOverlay?: (panel: "kasa" | "api" | "tenant" | "direktorler" | null) => void
}) {
  const [overlayMenu, setOverlayMenu] = useState<null | "kasa" | "api" | "tenant" | "direktor">(null)

  const MENU_ITEMS: Array<{
    key: "kasa" | "api" | "tenant" | "direktor"
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    color: string
  }> = [
    { key: "kasa", label: "Kasa", icon: Wallet, color: "#10b981" },
    { key: "api", label: "API", icon: Server, color: "#3b82f6" },
    { key: "tenant", label: "Tenant", icon: Building2, color: "#00d4ff" },
    { key: "direktor", label: "Direktörler", icon: LayoutGrid, color: "#f59e0b" },
  ]

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a2e]/80 bg-[#0a0a1a]/95 backdrop-blur-sm flex-shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff]/20 to-[#818cf8]/20 border border-[#00d4ff]/30 flex items-center justify-center">
          <span className="text-xs font-bold text-[#00d4ff] font-mono">Y</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#e2e8f0] font-mono tracking-wider">
            YİSA-S
          </span>
          <span className="text-[8px] text-[#8892a8] font-mono tracking-[0.2em] uppercase">
            Patron Paneli
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex items-center gap-1 bg-[#0f0f2a]/60 rounded-xl p-1 border border-[#1a1a2e]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`
              px-5 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-200
              ${
                activeTab === tab.key
                  ? "bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30 shadow-[0_0_12px_rgba(0,212,255,0.1)]"
                  : "text-[#8892a8] hover:text-[#e2e8f0] hover:bg-[#1a1a2e]/60 border border-transparent"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Patron status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[#0f0f2a]/60 rounded-xl p-1 border border-[#1a1a2e]">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const active = overlayMenu === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  const next = overlayMenu === item.key ? null : item.key
                  setOverlayMenu(next)
                  onOpenQuickOverlay?.(next === "direktor" ? "direktorler" : next)
                }}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition-colors border"
                style={{
                  color: active ? item.color : "#8892a8",
                  borderColor: active ? `${item.color}55` : "transparent",
                  backgroundColor: active ? `${item.color}15` : "transparent",
                }}
              >
                <Icon size={12} />
                {item.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 bg-[#0f0f2a]/60 rounded-xl px-4 py-2 border border-[#1a1a2e]">
          <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-xs font-mono text-[#e2e8f0] font-medium">Patron</span>
          <span className="text-[10px] font-mono text-[#10b981]">Çevrimiçi</span>
        </div>
      </div>

      {overlayMenu && (
        <div className="absolute top-full right-6 mt-2 z-50 w-[340px] rounded-xl border border-[#1a1a2e] bg-[#0a0a1a]/95 backdrop-blur-md shadow-[0_0_32px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a2e] flex items-center justify-between">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#00d4ff]">
              {MENU_ITEMS.find((m) => m.key === overlayMenu)?.label} Overlay
            </div>
            <button
              type="button"
              onClick={() => {
                setOverlayMenu(null)
                onOpenQuickOverlay?.(null)
              }}
              className="w-7 h-7 rounded-md border border-[#1a1a2e] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#00d4ff]/30 flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
          <div className="p-4">
            {overlayMenu === "kasa" && (
              <p className="text-xs font-mono text-[#8892a8]">
                Kasa ozeti bu panelden hizli goruntulenecek. Ayrintili islem icin KASA sekmesine gecin.
              </p>
            )}
            {overlayMenu === "api" && (
              <p className="text-xs font-mono text-[#8892a8]">
                API saglik durumlari bu panelde listelenecek. Ayrintili loglar ana panelde API kartlarinda.
              </p>
            )}
            {overlayMenu === "tenant" && (
              <p className="text-xs font-mono text-[#8892a8]">
                Tenant sayisi ve son kurulum hareketleri burada ozetlenir. Tam yonetim ana patron panelindedir.
              </p>
            )}
            {overlayMenu === "direktor" && (
              <p className="text-xs font-mono text-[#8892a8]">
                Direktorluk kisa durumu bu overlayde gorulur. Ayrintili gorevler soldaki direktorluk seciminden acilir.
              </p>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
