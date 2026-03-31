"use client"

import { useState, useEffect, useCallback } from "react"
import { Brain, Building2, Coins, Users, Wifi, Loader2, Activity } from "lucide-react"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"

// ==================== TYPES ====================

interface DirectorRule {
  id: string
  directorate: string
  data_access: string[] | string | null
  trigger_keywords: string[] | string | null
  has_veto: boolean
  created_at: string
}

interface RunningTask {
  id: string
  directorate: string
  ai_provider: string
  task_description: string
  status: string
  output_result: Record<string, unknown> | null
  output_type: string
  completed_at: string | null
  updated_at: string
}

interface DirectorateStatusInfo {
  runningCount: number
  completedCount: number
  lastActivity: string | null
}

interface BrainTeamData {
  directorRules: DirectorRule[]
  directorateStatus: Record<string, DirectorateStatusInfo>
  runningTasks: RunningTask[]
  recentCompleted: RunningTask[]
  ceoTasksSummary: { id: string; directorate: string; prompt: string; status: string; created_at: string }[]
  errors: { rules: string | null; tasks: string | null; ceo: string | null }
}

interface TenantSummary {
  count: number
  loading: boolean
}

interface TokenSummary {
  totalBalance: number
  loading: boolean
}

// ==================== HELPERS ====================

function getDirectorateColor(code: string): string {
  const dir = DIREKTORLUKLER.find((d) => d.code === code || d.slug === code)
  return dir?.neonColor ?? "#8892a8"
}

function getDirectorateName(code: string): string {
  const dir = DIREKTORLUKLER.find((d) => d.code === code || d.slug === code)
  return dir?.shortName ?? code
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "…"
}

// ==================== WIDGET CARD ====================

function WidgetCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size: number; className?: string; style?: React.CSSProperties }>
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-3">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}15`, borderWidth: 1, borderColor: `${iconColor}30` }}
        >
          <Icon size={12} style={{ color: iconColor }} />
        </div>
        <span className="text-[10px] font-mono font-bold text-[#e2e8f0] tracking-wider uppercase">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

// ==================== DIRECTOR STATUS LIST (LIVE) ====================

function DirectorStatusList({
  directorRules,
  directorateStatus,
  runningTasks,
  loading,
}: {
  directorRules: DirectorRule[]
  directorateStatus: Record<string, DirectorateStatusInfo>
  runningTasks: RunningTask[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="text-[#818cf8] animate-spin" />
      </div>
    )
  }

  if (directorRules.length === 0) {
    return (
      <p className="text-[9px] font-mono text-[#8892a8] text-center py-3">
        Henüz direktör kuralı tanımlanmamış.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {directorRules.map((rule) => {
        const color = getDirectorateColor(rule.directorate)
        const name = getDirectorateName(rule.directorate)
        const status = directorateStatus[rule.directorate]
        const isRunning = (status?.runningCount ?? 0) > 0
        const taskCount = (status?.runningCount ?? 0) + (status?.completedCount ?? 0)

        return (
          <div
            key={rule.id}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg"
            style={{ backgroundColor: `${color}05` }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-mono font-bold"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {rule.directorate.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-[#e2e8f0]">{name}</span>
                {taskCount > 0 && (
                  <span className="text-[7px] font-mono text-[#8892a8]">
                    {taskCount + " görev"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isRunning ? "bg-[#00d4ff] animate-pulse" : "bg-[#10b981]"
                }`}
              />
              <span className="text-[8px] font-mono text-[#8892a8]">
                {isRunning ? "Çalışıyor" : "Hazır"}
              </span>
              {rule.has_veto && (
                <span className="text-[6px] font-mono px-1 py-0.5 rounded bg-[#e94560]/10 text-[#e94560] border border-[#e94560]/20">
                  VETO
                </span>
              )}
            </div>
          </div>
        )
      })}

      {runningTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[#1a1a2e]/40">
          <span className="text-[8px] font-mono text-[#8892a8] uppercase tracking-wider">
            Aktif Görevler
          </span>
          {runningTasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="rounded-lg bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2 mt-1.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                  style={{
                    backgroundColor: getDirectorateColor(task.directorate) + "10",
                    color: getDirectorateColor(task.directorate),
                  }}
                >
                  {task.directorate}
                </span>
                <span className="text-[6px] font-mono text-[#8892a8]">
                  {task.ai_provider}
                </span>
              </div>
              <p className="text-[8px] font-mono text-[#e2e8f0]/70">
                {truncateText(task.task_description, 60)}
              </p>
              {task.output_result && (
                <p className="text-[7px] font-mono text-[#8892a8] mt-0.5">
                  {truncateText(
                    String(
                      (task.output_result as Record<string, unknown>).plan ??
                      (task.output_result as Record<string, unknown>).note ??
                      JSON.stringify(task.output_result).slice(0, 80)
                    ),
                    80
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== MAIN EXPORT ====================

export default function TabletRightPanel() {
  const [tenantSummary, setTenantSummary] = useState<TenantSummary>({ count: 0, loading: true })
  const [tokenSummary, setTokenSummary] = useState<TokenSummary>({ totalBalance: 0, loading: true })
  const [brainData, setBrainData] = useState<BrainTeamData | null>(null)
  const [brainLoading, setBrainLoading] = useState(true)

  const fetchBrainStatus = useCallback((showLoading = true) => {
    if (showLoading) setBrainLoading(true)
    fetch("/api/brain-team/status")
      .then((r) => r.json())
      .then((data: BrainTeamData) => {
        setBrainData(data)
        setBrainLoading(false)
      })
      .catch(() => setBrainLoading(false))
  }, [])

  useEffect(() => {
    // Fetch brain team status
    fetchBrainStatus()

    // Fetch tenant count
    fetch("/api/patron/tenants")
      .then((r) => r.json())
      .then((data) => {
        const tenants = Array.isArray(data) ? data : data?.tenants ?? []
        setTenantSummary({ count: tenants.length, loading: false })
      })
      .catch(() => setTenantSummary({ count: 0, loading: false }))

    // Fetch token costs
    fetch("/api/kasa/token-costs")
      .then((r) => r.json())
      .then((data) => {
        setTokenSummary({ totalBalance: data?.totalCost ?? 0, loading: false })
      })
      .catch(() => setTokenSummary({ totalBalance: 0, loading: false }))

    // Refresh brain status every 30s
    const interval = setInterval(() => fetchBrainStatus(false), 30000)
    return () => clearInterval(interval)
  }, [fetchBrainStatus])

  const activeDirectorCount = brainData?.directorRules?.length ?? 0
  const runningCount = brainData?.runningTasks?.length ?? 0

  return (
    <aside className="w-[240px] flex-shrink-0 border-l border-[#1a1a2e]/60 flex flex-col bg-[#0a0a1a]/60 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1a1a2e]/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[#818cf8]" />
          <h3 className="text-xs font-mono font-bold text-[#e2e8f0] tracking-wider">Beyin Takımı</h3>
        </div>
        <p className="text-[8px] font-mono text-[#8892a8] mt-1">Canlı durum ve istatistikler</p>
      </div>

      {/* Widgets */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {/* Token durumu */}
        <WidgetCard title="Token Durumu" icon={Coins} iconColor="#f59e0b">
          <div className="rounded-lg bg-[#0a0a1a]/80 border border-[#1a1a2e] p-3">
            <div className="text-[9px] font-mono text-[#8892a8] mb-1">Toplam Maliyet</div>
            <div className="text-xl font-mono font-bold text-[#f59e0b]">
              {tokenSummary.loading ? "..." : `$${tokenSummary.totalBalance.toFixed(2)}`}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div className="rounded-md bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2 text-center">
              <div className="text-xs font-mono font-bold text-[#00d4ff]">
                {activeDirectorCount}
              </div>
              <div className="text-[7px] font-mono text-[#8892a8]">Direktör</div>
            </div>
            <div className="rounded-md bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2 text-center">
              <div className="text-xs font-mono font-bold text-[#10b981]">
                {runningCount}
              </div>
              <div className="text-[7px] font-mono text-[#8892a8]">Aktif Görev</div>
            </div>
          </div>
        </WidgetCard>

        {/* Aktif tenant */}
        <WidgetCard title="Tenant Durumu" icon={Building2} iconColor="#00d4ff">
          <div className="flex items-center gap-3 bg-[#0a0a1a]/80 rounded-lg border border-[#1a1a2e] p-3">
            <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center">
              <Users size={18} className="text-[#00d4ff]" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-[#e2e8f0]">
                {tenantSummary.loading ? "..." : tenantSummary.count}
              </div>
              <div className="text-[8px] font-mono text-[#8892a8]">Aktif Tenant</div>
            </div>
          </div>
        </WidgetCard>

        {/* Direktör durumları (canlı) */}
        <WidgetCard title={`Direktör Durumu`} icon={Activity} iconColor="#10b981">
          <DirectorStatusList
            directorRules={brainData?.directorRules ?? []}
            directorateStatus={brainData?.directorateStatus ?? {}}
            runningTasks={brainData?.runningTasks ?? []}
            loading={brainLoading}
          />
        </WidgetCard>

        {/* Son tamamlanan görevler */}
        {(brainData?.recentCompleted?.length ?? 0) > 0 && (
          <WidgetCard title="Son Tamamlanan" icon={Wifi} iconColor="#818cf8">
            <div className="flex flex-col gap-1.5">
              {brainData?.recentCompleted?.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="text-[7px] font-mono font-bold px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: getDirectorateColor(task.directorate) + "10",
                        color: getDirectorateColor(task.directorate),
                      }}
                    >
                      {task.directorate}
                    </span>
                    <span className="text-[6px] font-mono text-[#10b981]">{`Tamamlandı`}</span>
                  </div>
                  <p className="text-[8px] font-mono text-[#e2e8f0]/70">
                    {truncateText(task.task_description, 50)}
                  </p>
                </div>
              ))}
            </div>
          </WidgetCard>
        )}
      </div>
    </aside>
  )
}
