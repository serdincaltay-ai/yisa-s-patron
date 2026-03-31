"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TabletTab } from "./TabletFrame"
import { MessageSquare, Clock, FileText, Send, ChevronDown, ChevronUp, Filter, CheckCircle, XCircle, Loader2, AlertTriangle, Mic, Paperclip, LayoutTemplate, Edit3 } from "lucide-react"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import { usePipeline, PIPELINE_STAGES } from "@/hooks/use-pipeline"
import type { PipelineStage } from "@/hooks/use-pipeline"
import PipelineStepper from "./PipelineStepper"
import { toast } from "@/hooks/use-toast"

// ==================== TYPES ====================

interface CelfEpic {
  id: string
  patron_command: string
  raw_command: string
  status: string
  parsed_directorates: string[] | null
  total_tasks: number
  completed_tasks: number
  created_at: string
  updated_at: string
  tasks: Record<string, CelfTask[]>
  tasksFlat: CelfTask[]
}

interface CelfTask {
  id: string
  epic_id: string
  directorate: string
  ai_provider: string
  task_description: string
  status: string
  output_type: string
  output_result: Record<string, unknown> | null
  apply_status: string | null
  completed_at: string | null
}

interface CeoTask {
  id: string
  directorate: string
  prompt: string
  result_payload: Record<string, unknown> | null
  status: string
  created_at: string
}

interface DemoRequestItem {
  id: string
  name: string
  email: string
  phone: string
  facility_type?: string
  city?: string
  notes?: string
  source?: string
  status: string
  durum?: string
  payment_status?: string
  payment_amount?: number
  rejection_reason?: string
  created_at: string
}

interface CommandResult {
  epicId: string
  parseMethod: string
  autoExecuted: boolean
  tasks: {
    id: string
    directorate: string
    ai_provider: string
    task_description: string
    exec_status: string
  }[]
}

type TaskExecStatus =
  | "queued"
  | "running"
  | "completed"
  | "applied"
  | "rejected"
  | "failed"
  | "needs_review"

// ==================== HELPERS ====================

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch {
    return dateStr
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed": case "donustu": case "onaylandi": return "#10b981"
    case "running": case "executing": case "distributed": return "#00d4ff"
    case "parsing": case "queued": case "new": case "beklemede": case "yeni": return "#f59e0b"
    case "failed": case "reddedildi": case "iptal": return "#e94560"
    case "partial": case "needs_review": case "gorusuldu": return "#818cf8"
    default: return "#8892a8"
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: "Tamamlandı",
    running: "Çalışıyor",
    executing: "Yürütülüyor",
    distributed: "Dağıtıldı",
    parsing: "Analiz",
    queued: "Kuyrukta",
    failed: "Başarısız",
    partial: "Kısmi",
    needs_review: "İnceleme",
    new: "Beklemede",
    beklemede: "Beklemede",
    yeni: "Yeni",
    donustu: "Dönüştü",
    onaylandi: "Onaylandı",
    reddedildi: "Reddedildi",
    iptal: "İptal",
    gorusuldu: "Görüşüldü",
    applied: "Uygulandı",
  }
  return labels[status] ?? status
}

function getDirectorateName(code: string): string {
  const dir = DIREKTORLUKLER.find((d) => d.code === code)
  return dir?.shortName ?? code
}

function getDirectorateColor(code: string): string {
  const dir = DIREKTORLUKLER.find((d) => d.code === code)
  return dir?.neonColor ?? "#8892a8"
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "…"
}

// ==================== CELF STATE MACHINE ====================

type CelfState = "HAZIRLANIYOR" | "ONAY_BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI"

function mapToCelfState(result: CommandResult | null): CelfState {
  if (!result) return "HAZIRLANIYOR"
  if (result.tasks.length === 0) return "ONAY_BEKLIYOR"
  const allApplied = result.tasks.every((t) => t.exec_status === "applied")
  const anyRejected = result.tasks.some((t) => t.exec_status === "rejected")
  if (anyRejected) return "REDDEDILDI"
  if (allApplied) return "ONAYLANDI"
  return "ONAY_BEKLIYOR"
}

const CELF_STATE_CONFIG: Record<CelfState, { label: string; color: string; bg: string }> = {
  HAZIRLANIYOR: { label: "Hazırlanıyor", color: "#f59e0b", bg: "#f59e0b" },
  ONAY_BEKLIYOR: { label: "Onay Bekliyor", color: "#00d4ff", bg: "#00d4ff" },
  ONAYLANDI: { label: "Onaylandı", color: "#10b981", bg: "#10b981" },
  REDDEDILDI: { label: "Reddedildi", color: "#e94560", bg: "#e94560" },
}

// ==================== ASK PANEL ====================

// ==================== PIPELINE TOAST NOTIFICATIONS ====================

const STAGE_TOAST_CONFIG: Record<PipelineStage, { title: string; description: string } | null> = {
  idle: null,
  konus: { title: "Konuş", description: "Komut gönderiliyor..." },
  onizle: { title: "Önizle", description: "AI cevabı hazır, önizleyin" },
  onay: { title: "Onay", description: "Kararınızı bekliyor" },
  uygula: { title: "Uygula", description: "CELF motoru uyguluyor" },
}

function notifyStageChange(stage: PipelineStage) {
  const config = STAGE_TOAST_CONFIG[stage]
  if (!config) return
  const stageInfo = PIPELINE_STAGES.find((s) => s.key === stage)
  toast({
    title: `${stageInfo?.label ?? config.title}`,
    description: config.description,
  })
}

function AskPanel({ activeDirectorate }: { activeDirectorate: string | null }) {
  const [command, setCommand] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [correctionText, setCorrectionText] = useState("")
  const [showCorrection, setShowCorrection] = useState(false)
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [applyAllLoading, setApplyAllLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const recognitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { pipeline, goToStage, resetPipeline } = usePipeline()

  const celfState = sending ? "HAZIRLANIYOR" as CelfState : mapToCelfState(result)
  const stateConfig = CELF_STATE_CONFIG[celfState]

  const handleSendCommand = useCallback(async (extraText?: string) => {
    const finalCommand = extraText ? `${command.trim()}\n\n[Düzeltme]: ${extraText}` : command.trim()
    if (!finalCommand || sending) return
    setSending(true)
    setError(null)
    setResult(null)
    setShowCorrection(false)
    setCorrectionText("")

    // Pipeline: KONUS stage
    goToStage("konus", "Komut gönderiliyor")
    notifyStageChange("konus")

    try {
      const res = await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: finalCommand,
          directorate_hint: activeDirectorate || undefined,
          auto_execute: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Komut gönderilemedi")
        resetPipeline()
      } else {
        setResult(data as CommandResult)
        setShowPreview(true)
        // Pipeline: ONIZLE stage
        goToStage("onizle", "Sonuçlar hazır")
        notifyStageChange("onizle")
      }
    } catch (e) {
      setError(String(e))
      resetPipeline()
    } finally {
      setSending(false)
    }
  }, [command, sending, activeDirectorate, goToStage, resetPipeline])

  const handleApplyTask = useCallback(async (taskId: string, skipPipelineTransition = false) => {
    if (!skipPipelineTransition) {
      // Pipeline: ONAY → UYGULA stage (single task)
      goToStage("onay", "Görev onaylanıyor")
      notifyStageChange("onay")
      await new Promise((r) => setTimeout(r, 300))
      goToStage("uygula", "Görev uygulanıyor")
      notifyStageChange("uygula")
    }
    try {
      const res = await fetch("/api/celf/tasks/apply/" + taskId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.applied) {
        setResult((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId ? { ...t, exec_status: "applied" } : t
            ),
          }
        })
      }
    } catch {
      if (!skipPipelineTransition) {
        resetPipeline()
      }
    }
  }, [goToStage, resetPipeline])

  const refreshTaskStatuses = useCallback(async (epicId: string) => {
    try {
      const res = await fetch(`/api/celf/tasks/board?epicId=${epicId}`)
      if (!res.ok) return
      const data = await res.json()
      const epic = Array.isArray(data?.epics) ? data.epics[0] : null
      const taskMap = new Map<string, TaskExecStatus>()
      ;(epic?.tasksFlat ?? []).forEach((t: { id: string; status: string; apply_status?: string | null }) => {
        const mapped = t.apply_status === "applied" ? "applied" : (t.status as TaskExecStatus)
        taskMap.set(t.id, mapped)
      })
      setResult((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          tasks: prev.tasks.map((task) => ({
            ...task,
            exec_status: taskMap.get(task.id) ?? task.exec_status,
          })),
        }
      })
    } catch {
      // no-op
    }
  }, [])

  const handleRejectTask = useCallback(async (taskId: string, reason: string) => {
    try {
      const res = await fetch("/api/celf/tasks/reject/" + taskId, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (data.rejected) {
        setResult((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId ? { ...t, exec_status: "rejected" } : t
            ),
          }
        })
      }
    } catch {
      // silently handle
    } finally {
      setRejectingTaskId(null)
      setRejectReason("")
    }
  }, [])

  const handleApplyAll = useCallback(async () => {
    if (!result) return
    setApplyAllLoading(true)
    try {
      // Pipeline: ONAY → UYGULA
      goToStage("onay", "Toplu onay veriliyor")
      notifyStageChange("onay")
      // Small delay for visual feedback before applying
      await new Promise((r) => setTimeout(r, 400))
      goToStage("uygula", "Tüm görevler uygulanıyor")
      notifyStageChange("uygula")
      for (const task of result.tasks) {
        if (task.exec_status === "completed" || task.exec_status === "needs_review") {
          await handleApplyTask(task.id, true)
        }
      }
      await refreshTaskStatuses(result.epicId)
    } finally {
      setApplyAllLoading(false)
    }
  }, [result, handleApplyTask, goToStage, refreshTaskStatuses])

  const stopListening = useCallback(() => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current)
      recognitionTimeoutRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // no-op
      }
    }
    setIsListening(false)
  }, [])

  const handleStartListening = useCallback(() => {
    if (typeof window === "undefined") return
    const SpeechRecognitionCtor =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      toast({
        title: "Sesli komut desteklenmiyor",
        description: "Tarayıcınız ses kaydını desteklemiyor",
      })
      return
    }

    if (isListening) {
      stopListening()
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognitionRef.current = recognition
    recognition.lang = "tr-TR"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = true

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r?.[0]?.transcript ?? "")
        .join(" ")
        .trim()
      if (transcript) {
        setCommand((prev) => {
          if (!prev.trim()) return transcript
          return `${prev.trim()}\n${transcript}`
        })
      }
    }
    recognition.onerror = () => {
      setIsListening(false)
      toast({
        title: "Ses kaydı hatası",
        description: "Ses komutu alınamadı, lütfen tekrar deneyin.",
      })
    }
    recognition.onend = () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current)
        recognitionTimeoutRef.current = null
      }
      setIsListening(false)
    }

    try {
      recognition.start()
      setIsListening(true)
      recognitionTimeoutRef.current = setTimeout(() => {
        stopListening()
      }, 60000)
    } catch {
      setIsListening(false)
      toast({
        title: "Sesli komut başlatılamadı",
        description: "Tarayıcı mikrofon erişimi vermedi veya desteklemiyor.",
      })
    }
  }, [isListening, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // no-op
        }
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline Stepper */}
      <div className="px-6 pt-3 pb-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <PipelineStepper
            currentStage={pipeline.stage}
            completedStages={pipeline.completedStages}
          />
          {pipeline.stage === "idle" && (
            <span className="text-[9px] font-mono text-[#8892a8] uppercase tracking-wider">
              Komut bekleniyor
            </span>
          )}
          {pipeline.stageLabel && pipeline.stage !== "idle" && (
            <span
              className="text-[8px] font-mono px-2 py-0.5 rounded-full animate-pulse"
              style={{
                backgroundColor: (PIPELINE_STAGES.find((s) => s.key === pipeline.stage)?.color ?? "#8892a8") + "15",
                color: PIPELINE_STAGES.find((s) => s.key === pipeline.stage)?.color ?? "#8892a8",
              }}
            >
              {pipeline.stageLabel}
            </span>
          )}
        </div>

        {/* Active directorate chips */}
        {result && result.tasks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Array.from(new Set(result.tasks.map((t) => t.directorate))).map((dir) => {
              const dirTasks = result.tasks.filter((t) => t.directorate === dir)
              const allDone = dirTasks.every((t) => t.exec_status === "completed" || t.exec_status === "applied")
              const anyRunning = dirTasks.some((t) => t.exec_status === "running" || t.exec_status === "executing")
              const chipColor = allDone ? "#10b981" : anyRunning ? "#00d4ff" : "#f59e0b"
              return (
                <span
                  key={dir}
                  className="text-[8px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: chipColor + "15",
                    color: chipColor,
                    borderWidth: 1,
                    borderColor: chipColor + "30",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: chipColor }} />
                  {dir}: {allDone ? "tamamlandı" : anyRunning ? "çalışıyor" : "bekliyor"}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!result && !error && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#00d4ff]/5 border border-[#00d4ff]/20 flex items-center justify-center">
              <MessageSquare size={28} className="text-[#00d4ff]/40" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-mono font-bold text-[#e2e8f0] mb-1">
                Patron Komut Alanı
              </h3>
              <p className="text-xs font-mono text-[#8892a8] max-w-md">
                {activeDirectorate
                  ? getDirectorateName(activeDirectorate) + " direktörlüğüne komut gönderin. CELF motoru ilgili AI sağlayıcısına yönlendirecek."
                  : "Bir direktörlük seçin veya doğrudan komut yazın. CELF 12 direktörlüğe dağıtacak."}
              </p>
            </div>
          </div>
        )}

        {sending && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={32} className="animate-spin text-[#00d4ff]" />
            <p className="text-sm font-mono text-[#8892a8]">CELF motoru analiz ediyor…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#e94560]/30 bg-[#e94560]/5 p-4 mb-4">
            <div className="flex items-center gap-2 text-[#e94560]">
              <AlertTriangle size={16} />
              <span className="text-sm font-mono">{error}</span>
            </div>
          </div>
        )}

        {result && showPreview && (
          <div className="flex flex-col gap-3">
            {/* Preview header */}
            <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[#f59e0b] uppercase tracking-wider font-bold">
                  Önizleme — {stateConfig.label}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                  {result.parseMethod}
                </span>
              </div>
              <p className="text-xs font-mono text-[#e2e8f0] mb-1">
                {truncateText(command, 100)}
              </p>
              <p className="text-[9px] font-mono text-[#8892a8]">
                {result.tasks.length + " görev oluşturuldu"}{result.autoExecuted ? " ve otomatik çalıştırıldı" : ""}
              </p>
            </div>

            {/* Task list */}
            {result.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: getDirectorateColor(task.directorate) + "15",
                        color: getDirectorateColor(task.directorate),
                        borderWidth: 1,
                        borderColor: getDirectorateColor(task.directorate) + "30",
                      }}
                    >
                      {task.directorate}
                    </span>
                    <span className="text-[8px] font-mono text-[#8892a8]">
                      {task.ai_provider}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: getStatusColor(task.exec_status) + "15",
                        color: getStatusColor(task.exec_status),
                      }}
                    >
                      {getStatusLabel(task.exec_status)}
                    </span>
                    {(task.exec_status === "completed" || task.exec_status === "needs_review") && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApplyTask(task.id)}
                          className="text-[8px] font-mono px-2 py-0.5 rounded-md bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/20 transition-colors"
                        >
                          Onayla
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectingTaskId(task.id); setRejectReason("") }}
                          className="text-[8px] font-mono px-2 py-0.5 rounded-md bg-[#e94560]/10 text-[#e94560] border border-[#e94560]/30 hover:bg-[#e94560]/20 transition-colors"
                        >
                          Reddet
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[10px] font-mono text-[#e2e8f0]/80">
                  {truncateText(task.task_description, 150)}
                </p>

                {/* Reject reason textarea */}
                {rejectingTaskId === task.id && (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Red sebebini yazın…"
                      className="w-full bg-[#0a0a1a] border border-[#e94560]/30 rounded-lg p-2 text-xs font-mono text-[#e2e8f0] placeholder-[#8892a8]/40 outline-none focus:border-[#e94560]/60 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => { setRejectingTaskId(null); setRejectReason("") }}
                        className="text-[8px] font-mono px-3 py-1 rounded-md bg-[#1a1a2e] text-[#8892a8] hover:bg-[#2a2a3e] transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectTask(task.id, rejectReason)}
                        disabled={!rejectReason.trim()}
                        className="text-[8px] font-mono px-3 py-1 rounded-md bg-[#e94560]/10 text-[#e94560] border border-[#e94560]/30 hover:bg-[#e94560]/20 transition-colors disabled:opacity-30"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Action buttons: Onayla & Uygula / Düzelt / Yeni Komut */}
            <div className="flex flex-wrap gap-2 pt-2">
              {result.tasks.some((t) => t.exec_status === "completed" || t.exec_status === "needs_review") && (
                <button
                  type="button"
                  onClick={handleApplyAll}
                  disabled={applyAllLoading}
                  className="flex items-center gap-1.5 text-[10px] font-mono px-4 py-2 rounded-lg bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/20 transition-colors"
                >
                  <CheckCircle size={12} />
                  {applyAllLoading ? "Uygulaniyor..." : "Onayla & Uygula"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCorrection(!showCorrection)}
                className="flex items-center gap-1.5 text-[10px] font-mono px-4 py-2 rounded-lg bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/30 hover:bg-[#818cf8]/20 transition-colors"
              >
                <Edit3 size={12} />
                Düzelt
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setShowPreview(false)
                  setCommand("")
                  resetPipeline()
                }}
                className="text-[10px] font-mono px-4 py-2 rounded-lg text-[#00d4ff] hover:text-[#00d4ff]/80 transition-colors border border-[#1a1a2e] hover:border-[#00d4ff]/30"
              >
                + Yeni komut
              </button>
            </div>

            {/* Correction textarea */}
            {showCorrection && (
              <div className="rounded-xl border border-[#818cf8]/20 bg-[#818cf8]/5 p-3">
                <p className="text-[9px] font-mono text-[#818cf8] mb-2 uppercase tracking-wider">
                  Düzeltme Notu
                </p>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="Ek talimat veya düzeltme yazın…"
                  className="w-full bg-[#0a0a1a] border border-[#818cf8]/20 rounded-lg p-2 text-xs font-mono text-[#e2e8f0] placeholder-[#8892a8]/40 outline-none focus:border-[#818cf8]/40 resize-none"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() => handleSendCommand(correctionText)}
                  disabled={!correctionText.trim() || sending}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-mono px-4 py-2 rounded-lg bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/30 hover:bg-[#818cf8]/20 transition-colors disabled:opacity-30"
                >
                  <Send size={12} />
                  Düzeltmeyi Gönder
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Command input area */}
      <div className="px-6 pb-4 flex-shrink-0">
        <div className="flex flex-col gap-2 bg-[#0f0f2a]/80 rounded-xl border border-[#1a1a2e] p-3">
          <textarea
            ref={textareaRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendCommand()
              }
            }}
            placeholder={
              activeDirectorate
                ? getDirectorateName(activeDirectorate) + " için komut yazın…"
                : "Patron komutu yazın…"
            }
            className="w-full bg-transparent text-sm font-mono text-[#e2e8f0] placeholder-[#8892a8]/40 outline-none px-1 py-1 resize-none min-h-[60px] max-h-[120px]"
            disabled={sending}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Sesli komut"
                onClick={handleStartListening}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                  isListening
                    ? "bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]"
                    : "bg-[#1a1a2e] border-[#2a2a3e] text-[#8892a8] hover:text-[#00d4ff] hover:border-[#00d4ff]/30"
                }`}
              >
                <Mic size={14} />
              </button>
              <button
                type="button"
                title="Dosya ekle"
                className="w-8 h-8 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] flex items-center justify-center text-[#8892a8] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-colors"
              >
                <Paperclip size={14} />
              </button>
              <button
                type="button"
                title="Şablon kullan"
                className="w-8 h-8 rounded-lg bg-[#1a1a2e] border border-[#2a2a3e] flex items-center justify-center text-[#8892a8] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-colors"
              >
                <LayoutTemplate size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSendCommand()}
              disabled={sending || !command.trim()}
              className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
        <p className="text-[9px] font-mono text-[#8892a8]/50 mt-2 text-center">
          {activeDirectorate
            ? getDirectorateName(activeDirectorate) + " direktörlüğüne yönlendirilecek"
            : "CELF motoru ilgili direktörlüklere dağıtacak"}
        </p>
      </div>
    </div>
  )
}

// ==================== SESSION PANEL ====================

type SessionFilter = "all" | "completed" | "failed" | "running"

function SessionPanel() {
  const [epics, setEpics] = useState<CelfEpic[]>([])
  const [ceoTasks, setCeoTasks] = useState<CeoTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SessionFilter>("all")
  const [expandedEpic, setExpandedEpic] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const boardRes = await fetch("/api/celf/tasks/board")
        if (boardRes.ok) {
          const boardData = await boardRes.json()
          setEpics(boardData.epics ?? [])
        }
        const statusRes = await fetch("/api/brain-team/status")
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setCeoTasks(statusData.ceoTasksSummary ?? [])
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredEpics = epics.filter((e) => {
    if (filter === "all") return true
    if (filter === "completed") return e.status === "completed"
    if (filter === "failed") return e.status === "failed" || e.status === "partial"
    if (filter === "running") return e.status === "running" || e.status === "executing" || e.status === "distributed" || e.status === "parsing"
    return true
  })

  const FILTERS: { key: SessionFilter; label: string; color: string }[] = [
    { key: "all", label: "Tümü", color: "#8892a8" },
    { key: "completed", label: "Onaylandı", color: "#10b981" },
    { key: "failed", label: "Reddedildi", color: "#e94560" },
    { key: "running", label: "İşleniyor", color: "#00d4ff" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="text-[#818cf8] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8">
        <AlertTriangle size={24} className="text-[#e94560]" />
        <p className="text-xs font-mono text-[#e94560]">{error}</p>
      </div>
    )
  }

  const hasData = epics.length > 0 || ceoTasks.length > 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[#1a1a2e]/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-[#8892a8]" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={"text-[9px] font-mono px-3 py-1 rounded-lg transition-all " + (
                filter === f.key
                  ? "border font-bold"
                  : "text-[#8892a8] hover:text-[#e2e8f0] border border-transparent"
              )}
              style={
                filter === f.key
                  ? { color: f.color, borderColor: f.color + "40", backgroundColor: f.color + "10" }
                  : undefined
              }
            >
              {f.label}
            </button>
          ))}
          <span className="text-[8px] font-mono text-[#8892a8] ml-auto">
            {filteredEpics.length + " kayıt"}
          </span>
        </div>
      </div>

      <div className="px-6 py-3 flex-shrink-0">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Toplam Epic", value: String(epics.length), color: "#00d4ff" },
            { label: "CEO Görevi", value: String(ceoTasks.length), color: "#818cf8" },
            { label: "Tamamlanan", value: String(epics.filter((ep) => ep.status === "completed").length), color: "#10b981" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border p-3 text-center"
              style={{ borderColor: stat.color + "20", background: stat.color + "05" }}
            >
              <div className="text-xl font-mono font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-[8px] font-mono text-[#8892a8] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {!hasData && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Clock size={24} className="text-[#818cf8]/30" />
            <p className="text-xs font-mono text-[#8892a8]">
              Henüz oturum geçmişi yok. ASK sekmesinden komut gönderin.
            </p>
          </div>
        )}

        {filteredEpics.map((epic) => {
          const isExpanded = expandedEpic === epic.id
          const directorates = epic.parsed_directorates ?? []

          return (
            <div key={epic.id} className="mb-2">
              <button
                type="button"
                onClick={() => setExpandedEpic(isExpanded ? null : epic.id)}
                className="w-full rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-3 text-left hover:border-[#00d4ff]/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-xs font-mono font-bold text-[#e2e8f0] truncate">
                      {epic.patron_command || epic.raw_command || "Komut"}
                    </p>
                    <p className="text-[9px] font-mono text-[#8892a8] mt-1">
                      {formatDate(epic.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-[8px] font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: getStatusColor(epic.status) + "15",
                        color: getStatusColor(epic.status),
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: getStatusColor(epic.status) + "30",
                      }}
                    >
                      {getStatusLabel(epic.status)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={12} className="text-[#8892a8]" />
                    ) : (
                      <ChevronDown size={12} className="text-[#8892a8]" />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {directorates.map((dir) => (
                    <span
                      key={dir}
                      className="text-[7px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: getDirectorateColor(dir) + "10",
                        color: getDirectorateColor(dir),
                      }}
                    >
                      {dir}
                    </span>
                  ))}
                  {directorates.length === 0 && (
                    <span className="text-[7px] font-mono text-[#8892a8]">
                      {epic.total_tasks + " görev"}
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="ml-3 mt-1 border-l-2 border-[#1a1a2e] pl-3 pb-2">
                  <div className="text-[9px] font-mono text-[#8892a8] mb-2">
                    {epic.total_tasks + " görev, " + epic.completed_tasks + " tamamlandı"}
                  </div>
                  {epic.tasksFlat.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-[#1a1a2e]/60 bg-[#0a0a1a]/40 p-2 mb-1.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: getDirectorateColor(task.directorate) + "10",
                              color: getDirectorateColor(task.directorate),
                            }}
                          >
                            {task.directorate}
                          </span>
                          <span className="text-[7px] font-mono text-[#8892a8]">
                            {task.ai_provider}
                          </span>
                        </div>
                        <span
                          className="text-[7px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: getStatusColor(task.status) + "15",
                            color: getStatusColor(task.status),
                          }}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                      </div>
                      <p className="text-[9px] font-mono text-[#e2e8f0]/70 mb-1">
                        {truncateText(task.task_description, 120)}
                      </p>
                      {task.output_result && (
                        <div className="rounded-md bg-[#0f0f2a]/60 border border-[#1a1a2e] p-2 mt-1">
                          <span className="text-[7px] font-mono text-[#8892a8] uppercase">
                            {"Çıktı (" + task.output_type + ")"}
                          </span>
                          <p className="text-[8px] font-mono text-[#e2e8f0]/60 mt-0.5">
                            {truncateText(
                              String(
                                (task.output_result as Record<string, unknown>).plan ??
                                (task.output_result as Record<string, unknown>).note ??
                                JSON.stringify(task.output_result).slice(0, 200)
                              ),
                              200
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {ceoTasks.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[10px] font-mono text-[#8892a8] uppercase tracking-wider mb-2 px-1">
              CEO Görev Geçmişi
            </h4>
            {ceoTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-3 mb-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: getDirectorateColor(task.directorate) + "10",
                        color: getDirectorateColor(task.directorate),
                      }}
                    >
                      {task.directorate || "CELF"}
                    </span>
                    <span className="text-[9px] font-mono text-[#8892a8]">
                      {formatDate(task.created_at)}
                    </span>
                  </div>
                  <span
                    className="text-[7px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: getStatusColor(task.status) + "15",
                      color: getStatusColor(task.status),
                    }}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </div>
                <p className="text-[9px] font-mono text-[#e2e8f0]/80">
                  {truncateText(task.prompt, 120)}
                </p>
                {task.result_payload && (
                  <p className="text-[8px] font-mono text-[#8892a8] mt-1">
                    {truncateText(
                      String(
                        (task.result_payload as Record<string, unknown>).plan ??
                        JSON.stringify(task.result_payload).slice(0, 150)
                      ),
                      150
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== TALEPLER PANEL ====================

type TalepFilter = "all" | "beklemede" | "donustu" | "iptal"

function TaleplerPanel() {
  const [requests, setRequests] = useState<DemoRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TalepFilter>("all")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/demo-requests?limit=50")
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data ?? [])
      } else {
        const fallbackRes = await fetch("/api/patron-havuzu")
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          setRequests(fallbackData.demoRequests ?? fallbackData.data ?? [])
        }
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApprove = useCallback(async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/demo-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "onaylandi" }),
      })
      if (res.ok) {
        await fetchRequests()
      } else {
        const errData = await res.json()
        setError(errData.error?.message || "Onay başarısız")
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setActionLoading(null)
    }
  }, [fetchRequests])

  const handleReject = useCallback(async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/demo-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reddedildi" }),
      })
      if (res.ok) {
        await fetchRequests()
      } else {
        const errData = await res.json()
        setError(errData.error?.message || "Red başarısız")
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setActionLoading(null)
    }
  }, [fetchRequests])

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true
    if (filter === "beklemede") return r.status === "new" || r.status === "beklemede" || r.status === "yeni"
    if (filter === "donustu") return r.status === "donustu" || r.status === "onaylandi"
    if (filter === "iptal") return r.status === "iptal" || r.status === "reddedildi"
    return true
  })

  const FILTERS: { key: TalepFilter; label: string; color: string }[] = [
    { key: "all", label: "Tümü", color: "#8892a8" },
    { key: "beklemede", label: "Bekleyen", color: "#f59e0b" },
    { key: "donustu", label: "Onaylanan", color: "#10b981" },
    { key: "iptal", label: "Reddedilen", color: "#e94560" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="text-[#f59e0b] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-[#1a1a2e]/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-[#8892a8]" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={"text-[9px] font-mono px-3 py-1 rounded-lg transition-all " + (
                filter === f.key
                  ? "border font-bold"
                  : "text-[#8892a8] hover:text-[#e2e8f0] border border-transparent"
              )}
              style={
                filter === f.key
                  ? { color: f.color, borderColor: f.color + "40", backgroundColor: f.color + "10" }
                  : undefined
              }
            >
              {f.label}
            </button>
          ))}
          <span className="text-[8px] font-mono text-[#8892a8] ml-auto">
            {filteredRequests.length + " talep"}
          </span>
        </div>
      </div>

      <div className="px-6 py-3 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Bekleyen", value: String(requests.filter((r) => r.status === "new" || r.status === "beklemede" || r.status === "yeni").length), color: "#f59e0b" },
            { label: "Onaylanan", value: String(requests.filter((r) => r.status === "donustu" || r.status === "onaylandi").length), color: "#10b981" },
            { label: "Reddedilen", value: String(requests.filter((r) => r.status === "iptal" || r.status === "reddedildi").length), color: "#e94560" },
            { label: "Toplam", value: String(requests.length), color: "#818cf8" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border p-2 text-center"
              style={{ borderColor: stat.color + "20", background: stat.color + "05" }}
            >
              <div className="text-lg font-mono font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-[7px] font-mono text-[#8892a8] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-2 rounded-xl border border-[#e94560]/30 bg-[#e94560]/5 p-3">
          <p className="text-[10px] font-mono text-[#e94560]">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {filteredRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FileText size={24} className="text-[#f59e0b]/30" />
            <p className="text-xs font-mono text-[#8892a8]">
              {filter === "all" ? "Henüz talep yok." : "Bu filtrede talep bulunamadı."}
            </p>
          </div>
        )}

        {filteredRequests.map((req) => {
          const isPending = req.status === "new" || req.status === "beklemede" || req.status === "yeni"
          const isProcessing = actionLoading === req.id

          return (
            <div
              key={req.id}
              className="rounded-xl border border-[#1a1a2e] bg-[#0f0f2a]/40 p-4 mb-3"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-sm font-mono font-bold text-[#e2e8f0] truncate">
                    {req.name}
                  </h4>
                  <p className="text-[9px] font-mono text-[#8892a8] mt-0.5">
                    {req.email} &middot; {formatDate(req.created_at)}
                  </p>
                </div>
                <span
                  className="text-[8px] font-mono px-2 py-1 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: getStatusColor(req.status) + "15",
                    color: getStatusColor(req.status),
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: getStatusColor(req.status) + "30",
                  }}
                >
                  {getStatusLabel(req.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2">
                  <span className="text-[7px] font-mono text-[#8892a8] uppercase">Telefon</span>
                  <p className="text-[9px] font-mono text-[#e2e8f0]">{req.phone}</p>
                </div>
                {req.facility_type && (
                  <div className="rounded-lg bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2">
                    <span className="text-[7px] font-mono text-[#8892a8] uppercase">Tesis</span>
                    <p className="text-[9px] font-mono text-[#e2e8f0]">{req.facility_type}</p>
                  </div>
                )}
                {req.city && (
                  <div className="rounded-lg bg-[#0a0a1a]/60 border border-[#1a1a2e] p-2">
                    <span className="text-[7px] font-mono text-[#8892a8] uppercase">Şehir</span>
                    <p className="text-[9px] font-mono text-[#e2e8f0]">{req.city}</p>
                  </div>
                )}
              </div>

              {req.notes && (
                <p className="text-[9px] font-mono text-[#8892a8] mb-3 italic">
                  &ldquo;{truncateText(typeof req.notes === "string" && req.notes.startsWith("{") ? "Detay mevcut" : req.notes, 120)}&rdquo;
                </p>
              )}

              {isPending && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(req.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-[10px] font-mono font-bold hover:bg-[#10b981]/20 transition-colors disabled:opacity-40"
                  >
                    {isProcessing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    Onayla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(req.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#e94560]/10 border border-[#e94560]/30 text-[#e94560] text-[10px] font-mono font-bold hover:bg-[#e94560]/20 transition-colors disabled:opacity-40"
                  >
                    {isProcessing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    Reddet
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ==================== MAIN EXPORT ====================

export default function TabletCenterPanel({
  activeTab,
  activeDirectorate,
}: {
  activeTab: TabletTab
  activeDirectorate: string | null
}) {
  return (
    <main className="flex-1 min-w-0 flex flex-col bg-[#0a0a1a]/40 overflow-hidden">
      <div className="px-6 py-3 border-b border-[#1a1a2e]/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
          <span className="text-[10px] font-mono text-[#8892a8] tracking-wider uppercase">
            {activeTab === "ASK" && "Komut Merkezi"}
            {activeTab === "SESSION" && "Oturum Geçmişi"}
            {activeTab === "TALEPLER" && "Talep Yönetimi"}
          </span>
          {activeDirectorate && (
            <>
              <span className="text-[10px] text-[#8892a8]/40 font-mono">|</span>
              <span className="text-[10px] font-mono text-[#00d4ff]">
                {activeDirectorate}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "ASK" && <AskPanel activeDirectorate={activeDirectorate} />}
        {activeTab === "SESSION" && <SessionPanel />}
        {activeTab === "TALEPLER" && <TaleplerPanel />}
      </div>
    </main>
  )
}
