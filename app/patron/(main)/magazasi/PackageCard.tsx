"use client"

import { Check, Sparkles } from "lucide-react"
import type { PackageDefinition, RobotDefinition } from "@/lib/store/robots-config"

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; glow: string }> = {
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", badge: "bg-cyan-500/20", glow: "shadow-cyan-500/10" },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400", badge: "bg-indigo-500/20", glow: "shadow-indigo-500/10" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/20", glow: "shadow-amber-500/10" },
}

interface PackageCardProps {
  pkg: PackageDefinition
  robots: RobotDefinition[]
  isOwned: boolean
  onAddToCart: (pkg: PackageDefinition) => void
  isInCart: boolean
}

export default function PackageCard({ pkg, robots, isOwned, onAddToCart, isInCart }: PackageCardProps) {
  const colors = colorMap[pkg.color] ?? colorMap.cyan

  return (
    <div
      className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 flex flex-col gap-4 transition-all hover:scale-[1.01] shadow-lg ${colors.glow}`}
    >
      {pkg.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-bold ${colors.text} ${colors.badge} px-3 py-1 rounded-full`}>
          <Sparkles className="w-3 h-3" />
          {pkg.badge}
        </div>
      )}

      {isOwned && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
          <Check className="w-3 h-3" />
          Aktif
        </div>
      )}

      <div className="text-center pt-2">
        <h3 className={`text-xl font-bold ${colors.text}`}>{pkg.name}</h3>
        <p className="text-sm text-zinc-400 mt-1">{pkg.description}</p>
      </div>

      <div className="text-center">
        <span className="text-3xl font-bold text-[#e2e8f0]">${pkg.monthlyPrice}</span>
        <span className="text-sm text-zinc-500 ml-1">/ay</span>
        {pkg.savings > 0 && (
          <div className={`text-xs ${colors.text} mt-1`}>
            %{pkg.savings} tasarruf
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Dahil Robotlar
        </h4>
        {robots.map((robot) => (
          <div
            key={robot.id}
            className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-800/30 rounded-lg px-3 py-2"
          >
            <Check className={`w-4 h-4 ${colors.text}`} />
            <span>{robot.name}</span>
            <span className="ml-auto text-xs text-zinc-500">${robot.monthlyPrice}/ay</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3">
        {isOwned ? (
          <div className="text-center text-xs text-zinc-500 py-2">Zaten sahipsiniz</div>
        ) : (
          <button
            onClick={() => onAddToCart(pkg)}
            disabled={isInCart}
            className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              isInCart
                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : `${colors.badge} ${colors.text} hover:opacity-80 border ${colors.border}`
            }`}
          >
            {isInCart ? "Sepette" : "Paketi Sec"}
          </button>
        )}
      </div>
    </div>
  )
}
