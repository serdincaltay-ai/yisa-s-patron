"use client"

import { Bot, Activity, Clock, CheckCircle2, Loader2 } from "lucide-react"

interface TenantRobot {
  id: string
  robot_id: string
  robot_name: string
  category: string
  status: string
  task_count: number
  last_active: string | null
  created_at: string
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  muhasebe: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  ik: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  pazarlama: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30" },
  veri: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  guvenlik: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
  active: { icon: CheckCircle2, label: "Aktif", color: "text-emerald-400" },
  working: { icon: Loader2, label: "Calisiyor", color: "text-cyan-400" },
  idle: { icon: Clock, label: "Beklemede", color: "text-zinc-400" },
}

interface ActiveRobotsClientProps {
  robots: TenantRobot[]
  tenantName: string | null
}

export default function ActiveRobotsClient({ robots, tenantName }: ActiveRobotsClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Aktif Robotlar
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          {tenantName
            ? `${tenantName} — atanmis robotlar ve gorev durumlari`
            : "Tenant'a atanmis robotlar"}
        </p>
      </div>

      {robots.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <Bot className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Henuz aktif robot yok.</p>
          <p className="text-zinc-500 text-xs mt-1">
            COO Magazasi&apos;ndan robot veya paket satin alarak baslayabilirsiniz.
          </p>
        </div>
      ) : (
        <>
          {/* Ozet kartlari */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Toplam Robot</p>
              <p className="text-2xl font-bold text-[#e2e8f0] mt-1">{robots.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Aktif</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {robots.filter((r) => r.status === "active" || r.status === "working").length}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Toplam Gorev</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {robots.reduce((sum, r) => sum + (r.task_count ?? 0), 0)}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Kategori</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {new Set(robots.map((r) => r.category)).size}
              </p>
            </div>
          </div>

          {/* Robot kartlari */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {robots.map((robot) => {
              const colors = categoryColors[robot.category] ?? categoryColors.veri
              const statusInfo = statusConfig[robot.status] ?? statusConfig.active
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={robot.id}
                  className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center`}>
                        <Bot className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#e2e8f0]">{robot.robot_name}</h3>
                        <span className={`text-xs ${colors.text} uppercase tracking-wider`}>
                          {robot.category}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${robot.status === "working" ? "animate-spin" : ""}`} />
                      {statusInfo.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 pt-2 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{robot.task_count} gorev</span>
                    </div>
                    {robot.last_active && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(robot.last_active).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
