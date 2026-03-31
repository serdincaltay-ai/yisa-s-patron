"use client"

import { Check } from "lucide-react"
import type { RobotDefinition } from "@/lib/store/robots-config"

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", badge: "bg-emerald-500/20" },
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500/20" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", badge: "bg-violet-500/20" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/20" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "bg-red-500/20" },
}

interface RobotCardProps {
  robot: RobotDefinition
  isOwned: boolean
  onAddToCart: (robot: RobotDefinition) => void
  isInCart: boolean
}

export default function RobotCard({ robot, isOwned, onAddToCart, isInCart }: RobotCardProps) {
  const colors = colorMap[robot.color] ?? colorMap.emerald

  return (
    <div
      className={`relative rounded-2xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-3 transition-all hover:scale-[1.01]`}
    >
      {isOwned && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
          <Check className="w-3 h-3" />
          Aktif
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${colors.badge} flex items-center justify-center`}>
          <span className={`text-lg font-bold ${colors.text}`}>
            {robot.name.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="text-base font-bold text-[#e2e8f0]">{robot.name}</h3>
          <span className={`text-xs ${colors.text} uppercase tracking-wider`}>
            {robot.category}
          </span>
        </div>
      </div>

      <p className="text-sm text-zinc-400 leading-relaxed">{robot.description}</p>

      <ul className="space-y-1.5">
        {robot.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-zinc-300">
            <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.text}`} />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-zinc-800/50">
        <div>
          <span className="text-2xl font-bold text-[#e2e8f0]">${robot.monthlyPrice}</span>
          <span className="text-xs text-zinc-500 ml-1">/ay</span>
        </div>
        {isOwned ? (
          <span className="text-xs text-zinc-500 px-3 py-2">Zaten sahipsiniz</span>
        ) : (
          <button
            onClick={() => onAddToCart(robot)}
            disabled={isInCart}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isInCart
                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : `${colors.badge} ${colors.text} hover:opacity-80`
            }`}
          >
            {isInCart ? "Sepette" : "Sepete Ekle"}
          </button>
        )}
      </div>
    </div>
  )
}
