"use client"

import { useEffect, useState } from "react"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import { cn } from "@/lib/utils"

interface DirectorStatus {
  slug: string
  status: "idle" | "working" | "error" | "offline"
  lastAction?: string
  updatedAt?: string
}

/**
 * Beyin Takimi — canli direktorluk durumlari.
 * Her direktorlugun o anki durumunu (bos/calisiyor/hata/cevrimdisi) gosterir.
 */
export default function DirectorStatusBar() {
  const [statuses, setStatuses] = useState<DirectorStatus[]>(
    DIREKTORLUKLER.map((d) => ({ slug: d.slug, status: "idle" as const }))
  )

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetch("/api/director-status")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.statuses)) {
            setStatuses((prev) =>
              prev.map((p) => {
                const updated = data.statuses.find((s: DirectorStatus) => s.slug === p.slug)
                return updated ?? p
              })
            )
          }
        }
      } catch {
        // API henüz mevcut olmayabilir — varsayılan idle durumu kullan
      }
    }

    fetchStatuses()
    const interval = setInterval(fetchStatuses, 15000) // 15s polling
    return () => clearInterval(interval)
  }, [])

  const statusColor = (status: DirectorStatus["status"]) => {
    switch (status) {
      case "working":
        return "bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.5)]"
      case "error":
        return "bg-[#e94560] shadow-[0_0_8px_rgba(233,69,96,0.5)]"
      case "offline":
        return "bg-[#8892a8]/30"
      default:
        return "bg-[#8892a8]/60"
    }
  }

  const statusLabel = (status: DirectorStatus["status"]) => {
    switch (status) {
      case "working":
        return "Çalışıyor"
      case "error":
        return "Hata"
      case "offline":
        return "Çevrimdışı"
      default:
        return "Boşta"
    }
  }

  return (
    <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3">
      <h4 className="text-xs font-medium text-[#8892a8] mb-2">
        Direktörlük Durumları
      </h4>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {statuses.map((ds) => {
          const dir = DIREKTORLUKLER.find((d) => d.slug === ds.slug)
          if (!dir) return null
          const Icon = dir.icon
          return (
            <div
              key={ds.slug}
              className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-all hover:border-white/10"
              title={`${dir.shortName}: ${statusLabel(ds.status)}${ds.lastAction ? ` — ${ds.lastAction}` : ""}`}
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={1.5}
                  style={{ color: dir.neonColor }}
                />
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                    statusColor(ds.status),
                    ds.status === "working" && "animate-pulse"
                  )}
                />
              </div>
              <span className="text-[9px] text-[#8892a8] text-center leading-tight truncate w-full">
                {dir.shortName}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
