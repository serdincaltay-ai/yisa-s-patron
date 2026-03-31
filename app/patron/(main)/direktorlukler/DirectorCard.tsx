"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { DirectorateConfig } from "@/lib/direktorlukler/config"

interface DirectorCardProps {
  directorate: DirectorateConfig
  lastCommand?: string
}

export default function DirectorCard({ directorate, lastCommand }: DirectorCardProps) {
  const router = useRouter()
  const Icon = directorate.icon
  const color = directorate.neonColor

  return (
    <Link
      href={`/patron/direktorlukler/${directorate.slug}`}
      className={cn(
        "group block min-h-[44px] rounded-xl border backdrop-blur-md bg-white/5 border-white/10",
        "transition-all duration-300 hover:scale-[1.02] hover:border-white/20",
        "p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a1a]"
      )}
      style={{
        boxShadow: `0 0 20px ${color}15`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 28px ${color}30, 0 0 14px ${color}20`
        e.currentTarget.style.borderColor = `${color}40`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 0 20px ${color}15`
        e.currentTarget.style.borderColor = ""
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 transition-all duration-300 group-hover:scale-105"
          style={{
            backgroundColor: `${color}15`,
            boxShadow: `0 0 16px ${color}25`,
            color,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 24px ${color}40, 0 0 12px ${color}30`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 0 16px ${color}25`
          }}
        >
          <Icon className="h-6 w-6" strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[#e2e8f0] truncate">{directorate.shortName}</h3>
          <p className="text-xs text-[#8892a8] truncate">{directorate.description}</p>
        </div>
      </div>
      {lastCommand && (
        <p className="mt-2 text-[10px] font-mono text-[#8892a8] truncate pl-[60px]">
          Son görev: {lastCommand}{lastCommand.length >= 60 ? "…" : ""}
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-3 w-full border-[#0f3460]/40 text-[#00d4ff]/80 hover:text-[#00d4ff] hover:border-[#00d4ff]/40 text-xs font-mono min-h-[36px]"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          router.push(`/patron/komut-merkezi?dir=${directorate.slug}`)
        }}
      >
        Komut Ver
      </Button>
    </Link>
  )
}
