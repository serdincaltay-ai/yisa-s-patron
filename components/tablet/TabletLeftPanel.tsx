"use client"

import TabletAvatar from "./TabletAvatar"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import { cn } from "@/lib/utils"

export default function TabletLeftPanel({
  activeDirectorate,
  onDirectorateSelect,
}: {
  activeDirectorate: string | null
  onDirectorateSelect: (code: string) => void
}) {
  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-[#1a1a2e]/60 flex flex-col bg-[#0a0a1a]/60 overflow-hidden">
      {/* Avatar area */}
      <div className="px-4 py-5 border-b border-[#1a1a2e]/40 flex-shrink-0">
        <TabletAvatar />
      </div>

      {/* Direktörlük listesi */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <h3 className="text-[10px] font-mono text-[#8892a8] uppercase tracking-[0.2em] px-2 mb-2">
          12 Direktörlük
        </h3>
        <div className="flex flex-col gap-1">
          {DIREKTORLUKLER.map((dir) => {
            const isActive = activeDirectorate === dir.code
            const Icon = dir.icon
            return (
              <button
                key={dir.code}
                type="button"
                onClick={() => onDirectorateSelect(dir.code)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-to-r from-[#00d4ff]/10 to-transparent border border-[#00d4ff]/25"
                    : "hover:bg-[#1a1a2e]/40 border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all",
                    isActive
                      ? "shadow-[0_0_8px_rgba(0,212,255,0.2)]"
                      : "group-hover:scale-105"
                  )}
                  style={{
                    backgroundColor: isActive ? `${dir.neonColor}20` : `${dir.neonColor}08`,
                    borderWidth: 1,
                    borderColor: isActive ? `${dir.neonColor}50` : `${dir.neonColor}20`,
                  }}
                >
                  <Icon
                    size={14}
                    style={{ color: dir.neonColor }}
                    className={cn(
                      "transition-opacity",
                      isActive ? "opacity-100" : "opacity-60 group-hover:opacity-90"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold tracking-wider",
                        isActive ? "text-[#00d4ff]" : "text-[#8892a8] group-hover:text-[#e2e8f0]"
                      )}
                    >
                      {dir.code}
                    </span>
                    {isActive && (
                      <div className="w-1 h-1 rounded-full bg-[#00d4ff] animate-pulse" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-mono block truncate",
                      isActive ? "text-[#e2e8f0]/70" : "text-[#8892a8]/60"
                    )}
                  >
                    {dir.shortName}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
