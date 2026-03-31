import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  color?: string
}

export default function StatCard({ title, value, icon: Icon, trend, color = "cyan" }: StatCardProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
    indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
    red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  }
  const c = colorMap[color] ?? colorMap.cyan

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-400 font-sans uppercase tracking-wider">{title}</span>
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <p className="text-2xl font-bold text-white font-sans">{value}</p>
      {trend && <p className={`text-xs ${c.text} mt-1 font-sans`}>{trend}</p>}
    </div>
  )
}
