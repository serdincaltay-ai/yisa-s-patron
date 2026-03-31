"use client"

import useSWR from "swr"
import { X, Bot, Activity, CheckCircle2 } from "lucide-react"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import { DIRECTORATE_AI_MAP } from "@/lib/celf-directorate-config"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type BrainTeamTask = {
  id: string
  directorate: string
  ai_provider: string
  task_description: string
  status: string
}

type BrainTeamStatus = {
  directorRules?: Array<{ directorate: string; has_veto: boolean }>
  directorateStatus?: Record<string, { runningCount: number; completedCount: number; lastActivity: string | null }>
  runningTasks?: BrainTeamTask[]
  recentCompleted?: BrainTeamTask[]
}

export default function DirectorateOverlay({
  directorateCode,
  onClose,
}: {
  directorateCode: string
  onClose: () => void
}) {
  const directorate = DIREKTORLUKLER.find((d) => d.code === directorateCode)
  const aiProvider = DIRECTORATE_AI_MAP[directorateCode] ?? "gpt"
  const { data } = useSWR<BrainTeamStatus>("/api/brain-team/status", fetcher, {
    refreshInterval: 8000,
  })

  const status = data?.directorateStatus?.[directorateCode]
  const runningTasks = (data?.runningTasks ?? []).filter((t) => t.directorate === directorateCode)
  const recentCompleted = (data?.recentCompleted ?? []).filter((t) => t.directorate === directorateCode)

  return (
    <div className="absolute inset-0 z-40 bg-[#050510]/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] rounded-2xl border border-[#00d4ff]/30 bg-[#0a0a1a] shadow-[0_0_50px_rgba(0,212,255,0.15)] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a1a2e]/60 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#00d4ff]">
              Direktorluk Overlay
            </div>
            <h3 className="text-lg font-bold text-[#e2e8f0] mt-0.5">
              {directorate?.code ?? directorateCode} - {directorate?.name ?? "Direktorluk"}
            </h3>
            <p className="text-xs text-[#8892a8] mt-1">
              AI atamasi: {aiProvider.toUpperCase()} | Aktif gorev: {status?.runningCount ?? 0}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-[#1a1a2e] bg-[#0f0f2a] hover:border-[#00d4ff]/40 text-[#8892a8] hover:text-[#00d4ff] flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto">
          <section className="rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-[#00d4ff]" />
              <h4 className="text-sm font-semibold text-[#e2e8f0]">Aktif Gorevler</h4>
            </div>
            {runningTasks.length === 0 ? (
              <p className="text-xs text-[#8892a8]">Bu direktorlukte su an aktif gorev yok.</p>
            ) : (
              <div className="space-y-2">
                {runningTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-[#1a1a2e] bg-[#0a0a1a]/60 p-3">
                    <div className="text-[10px] font-mono text-[#00d4ff] uppercase mb-1">{task.ai_provider}</div>
                    <div className="text-xs text-[#e2e8f0]">{task.task_description}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-[#10b981]" />
              <h4 className="text-sm font-semibold text-[#e2e8f0]">Son Tamamlananlar</h4>
            </div>
            {recentCompleted.length === 0 ? (
              <p className="text-xs text-[#8892a8]">Bu direktorluk icin tamamlanan gorev bulunamadi.</p>
            ) : (
              <div className="space-y-2">
                {recentCompleted.map((task) => (
                  <div key={task.id} className="rounded-lg border border-[#1a1a2e] bg-[#0a0a1a]/60 p-3">
                    <div className="text-[10px] font-mono text-[#10b981] uppercase mb-1">{task.status}</div>
                    <div className="text-xs text-[#e2e8f0]">{task.task_description}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-[#1a1a2e]/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#8892a8]">
            <Bot size={13} className="text-[#818cf8]" />
            {directorate?.description ?? "Direktorluk aciklamasi bulunamadi."}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono px-3 py-1.5 rounded-md border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
