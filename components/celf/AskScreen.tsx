"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import useSWR, { mutate } from "swr"
import CelfPreviewDialog from "@/components/dashboard/CelfPreviewDialog"
import type { CelfTaskForPreview } from "@/components/dashboard/CelfPreviewDialog"
import {
  Send,
  Mic,
  FileUp,
  LayoutTemplate,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Workflow,
  Image as ImageIcon,
  Video,
  Code2,
  Link2,
  FileText,
  MessageCircle,
  Terminal,
  Eye,
} from "lucide-react"
import { usePipeline, PIPELINE_STAGES } from "@/hooks/use-pipeline"
import type { PipelineStage } from "@/hooks/use-pipeline"
import PipelineStepper from "@/components/tablet/PipelineStepper"
import { toast } from "@/hooks/use-toast"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/* ── Orkestrasyon Tipleri ── */
interface OrchStepExecution {
  step_id: string
  agent_id: string
  label: string
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  output_type: string
  output: string | null
  output_url: string | null
  error: string | null
}

interface OrchChainExecution {
  execution_id: string
  chain_id: string
  chain_name: string
  user_input: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  steps: OrchStepExecution[]
  total_steps: number
  completed_steps: number
}

interface OrchChainTemplate {
  chain_id: string
  name: string
  description: string
  steps: { step_id: string; agent_id: string; label: string; output_type: string }[]
}

/** Çıktı tipine göre ikon seç */
function outputTypeIcon(type: string) {
  switch (type) {
    case "image": return ImageIcon
    case "video": return Video
    case "code": case "ui": return Code2
    case "url": return Link2
    default: return FileText
  }
}

/** Web Speech API recognition instance (browser-specific, not in DOM lib) */
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null
  start(): void
  stop(): void
}

/* ── Tipler ── */
interface CelfTask {
  id: string
  directorate: string
  status: string
  task_description: string
  output_result: Record<string, unknown> | null
  output_type: string | null
  rejection_reason: string | null
  exec_status?: string
  created_at: string
}

interface CelfEpic {
  id: string
  patron_command: string
  status: string
  total_tasks: number
  completed_tasks: number
  created_at: string
  tasksFlat: CelfTask[]
}

interface BoardData {
  epics: CelfEpic[]
  stats: { total: number; completed: number; running: number; failed: number }
}

/* ── CELF Durum Makinesi Renkleri ── */
const STATE_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  queued: { label: "HAZIRLANIYOR", color: "#f59e0b", icon: Clock },
  running: { label: "CALISIYOR", color: "#3b82f6", icon: Loader2 },
  completed: { label: "ONAY_BEKLIYOR", color: "#8b5cf6", icon: AlertTriangle },
  approved: { label: "ONAYLANDI", color: "#10b981", icon: CheckCircle2 },
  rejected: { label: "REDDEDILDI", color: "#ef4444", icon: XCircle },
  failed: { label: "BASARISIZ", color: "#ef4444", icon: XCircle },
}

/* ── Sablon Ornekleri ── */
const TEMPLATES = [
  "Yeni sporcu kayit formunu olustur",
  "Aylik gelir-gider raporunu hazirla",
  "Antrenör performans degerlendirmesi yap",
  "Sosyal medya icerigi planla",
  "Güvenlik denetim raporu olustur",
  "Marka kilavuzu guncelle",
]

interface PreviewTask {
  directorate: string
  ai_provider: string
  task_description: string
}

interface PreviewState {
  command: string
  tasks: PreviewTask[]
}

/* ── Sohbet Modu Tipleri ── */
interface ChatMessage {
  id: string
  role: 'patron' | 'brain-team' | 'system'
  content: string
  timestamp: Date
  type: 'chat' | 'command' | 'preview' | 'approval' | 'result'
  metadata?: {
    epicId?: string
    tasks?: PreviewTask[]
    status?: string
    suggestions?: string[]
  }
}

const CHAT_STORAGE_KEY = 'yisas-ask-chat-history'

function loadChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }))
  } catch {
    return []
  }
}

function saveChatHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    const toSave = messages.slice(-100)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // localStorage dolu olabilir
  }
}

// ==================== PIPELINE TOAST NOTIFICATIONS ====================

const ASK_STAGE_TOAST: Record<PipelineStage, { title: string; desc: string } | null> = {
  idle: null,
  konus: { title: "Konuş", desc: "Komut gönderiliyor..." },
  onizle: { title: "Önizle", desc: "AI cevabı hazır, önizleyin" },
  onay: { title: "Onay", desc: "Kararınızı bekliyor" },
  uygula: { title: "Uygula", desc: "CELF motoru uyguluyor" },
}

function notifyAskStage(stage: PipelineStage) {
  const cfg = ASK_STAGE_TOAST[stage]
  if (!cfg) return
  const info = PIPELINE_STAGES.find((s) => s.key === stage)
  toast({ title: info?.label ?? cfg.title, description: cfg.desc })
}

export default function AskScreen() {
  const [command, setCommand] = useState("")
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null)
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [previewTask, setPreviewTask] = useState<CelfTaskForPreview | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewEpicCommand, setPreviewEpicCommand] = useState<string>("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { pipeline, goToStage, resetPipeline } = usePipeline()

  // ── Sohbet Modu State ──
  const [chatMode, setChatMode] = useState<'chat' | 'command'>('command')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatSending, setChatSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // localStorage'dan sohbet geçmişini yükle
  useEffect(() => {
    const saved = loadChatHistory()
    if (saved.length > 0) setMessages(saved)
  }, [])

  // Sohbet geçmişi değiştiğinde kaydet & scroll
  useEffect(() => {
    if (messages.length > 0) saveChatHistory(messages)
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Orkestrasyon durumu
  const [orchExecution, setOrchExecution] = useState<OrchChainExecution | null>(null)
  const [orchPolling, setOrchPolling] = useState(false)
  const [showChainPicker, setShowChainPicker] = useState(false)
  const orchPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // CELF Board verisi
  const { data: board } = useSWR<BoardData>("/api/celf/tasks/board", fetcher, {
    refreshInterval: 5000,
  })

  // Orkestrasyon zincir şablonları
  const { data: chainData } = useSWR<{ chains: OrchChainTemplate[] }>(
    "/api/orchestration/run",
    fetcher
  )

  const epics = board?.epics ?? []
  const stats = {
    total: Number(board?.stats?.total) || 0,
    completed: Number(board?.stats?.completed) || 0,
    running: Number(board?.stats?.running) || 0,
    failed: Number(board?.stats?.failed) || 0,
  }

  // Secili epic
  const activeEpic = selectedEpicId ? epics.find((e) => e.id === selectedEpicId) : epics[0]

  // Aktif direktorlukler (en son epic'ten)
  const activeDirectorates = new Set(
    activeEpic?.tasksFlat?.map((t) => t.directorate) ?? []
  )

  // ── Komut gonder (preview mode: confirmed=false) ──
  const handleSend = useCallback(async () => {
    if (!command.trim() || sending) return
    setSending(true)
    // Pipeline: KONUS
    goToStage("konus", "Komut gönderiliyor")
    notifyAskStage("konus")

    try {
      const res = await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: command.trim(), confirmed: false }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.preview) {
          setPreview({ command: command.trim(), tasks: data.tasks as PreviewTask[] })
          // Pipeline: ONIZLE
          goToStage("onizle", "Önizleme hazır")
          notifyAskStage("onizle")
        } else {
          setCommand("")
          setSelectedEpicId(data.epicId || null)
          setPreview(null)
          // Pipeline: ONIZLE (auto-executed)
          goToStage("onizle", "Sonuçlar hazır")
          notifyAskStage("onizle")
          mutate("/api/celf/tasks/board")
        }
      } else {
        resetPipeline()
      }
    } catch {
      resetPipeline()
    } finally {
      setSending(false)
    }
  }, [command, sending, goToStage, resetPipeline])

  // ── Önizleme onayla (confirmed=true) ──
  const handleConfirmPreview = useCallback(async () => {
    if (!preview || confirming) return
    setConfirming(true)
    // Pipeline: ONAY
    goToStage("onay", "Onaylanıyor")
    notifyAskStage("onay")

    try {
      const res = await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: preview.command, confirmed: true, auto_execute: true }),
      })

      if (res.ok) {
        const data = await res.json()
        setCommand("")
        setPreview(null)
        setSelectedEpicId(data.epicId || null)
        // Pipeline: UYGULA
        goToStage("uygula", "Görevler uygulanıyor")
        notifyAskStage("uygula")
        mutate("/api/celf/tasks/board")
      } else {
        resetPipeline()
      }
    } catch {
      resetPipeline()
    } finally {
      setConfirming(false)
    }
  }, [preview, confirming, goToStage, resetPipeline])

  // ── Önizleme reddet ──
  const handleRejectPreview = useCallback(() => {
    setPreview(null)
    resetPipeline()
  }, [resetPipeline])

  // ── Ses tanima (Web Speech API) ──
  const handleVoice = useCallback(() => {
    const win = window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      alert("Tarayiciniz ses tanimayi desteklemiyor.")
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = "tr-TR"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event: { results: { transcript: string }[][] }) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (transcript) {
        setCommand((prev) => (prev ? prev + " " + transcript : transcript))
      }
    }

    recognition.start()
  }, [])

  // ── Mesaj ekleme yardımcısı ──
  const addMessage = useCallback(
    (role: ChatMessage['role'], content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
      const msg: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        timestamp: new Date(),
        type,
        metadata,
      }
      setMessages((prev) => [...prev, msg])
    },
    []
  )

  // ── Onayla & Uygula ──
  const handleApprove = useCallback(async (taskId: string) => {
    // Pipeline: ONAY → UYGULA
    goToStage("onay", "Görev onaylandı")
    notifyAskStage("onay")
    await new Promise((r) => setTimeout(r, 300))
    goToStage("uygula", "Uygulanıyor")
    notifyAskStage("uygula")
    try {
      const res = await fetch(`/api/celf/tasks/apply/${taskId}`, { method: "POST" })
      if (!res.ok) throw new Error("Apply failed")
      mutate("/api/celf/tasks/board")
      // Adım 4: Patron'a "Bu değişiklik uygulandı" mesajı göster
      addMessage('system', 'Bu değişiklik uygulandı. Görev başarıyla sisteme kaydedildi.', 'result')
    } catch {
      addMessage('system', 'Uygulama sırasında hata oluştu. Lütfen tekrar deneyin.', 'result')
      resetPipeline()
    }
  }, [goToStage, resetPipeline, addMessage])

  // ── Reddet ──
  const handleReject = useCallback(
    async (taskId: string) => {
      if (!rejectReason.trim()) return
      try {
        await fetch(`/api/celf/tasks/reject/${taskId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        })
        setRejectingTaskId(null)
        setRejectReason("")
        mutate("/api/celf/tasks/board")
      } catch {
        // Hata sessiz
      }
    },
    [rejectReason]
  )

  // ── Duzelt ve yeniden gonder ──
  const handleEdit = useCallback(
    async (originalCommand: string) => {
      if (!editText.trim()) return
      setSending(true)
      try {
        const newCommand = `${originalCommand}\n\nDUZELTME: ${editText.trim()}`
        await fetch("/api/celf/tasks/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: newCommand, auto_execute: true }),
        })
        setEditTaskId(null)
        setEditText("")
        mutate("/api/celf/tasks/board")
      } catch {
        // Hata sessiz
      } finally {
        setSending(false)
      }
    },
    [editText]
  )

  // ── Orkestrasyon durum sorgulama ──
  const pollOrchStatus = useCallback((executionId: string) => {
    // Önceki polling varsa temizle
    if (orchPollRef.current) clearInterval(orchPollRef.current)

    const poll = async () => {
      try {
        const res = await fetch(`/api/orchestration/status/${executionId}`)
        if (res.ok) {
          const data = (await res.json()) as OrchChainExecution
          setOrchExecution(data)
          if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
            setOrchPolling(false)
            if (orchPollRef.current) {
              clearInterval(orchPollRef.current)
              orchPollRef.current = null
            }
          }
        } else if (res.status === 404) {
          // Execution kayboldu (serverless restart veya eviction) — polling durdur
          setOrchPolling(false)
          if (orchPollRef.current) {
            clearInterval(orchPollRef.current)
            orchPollRef.current = null
          }
        }
      } catch {
        // Sessiz
      }
    }

    poll()
    orchPollRef.current = setInterval(poll, 2000)
  }, [])

  // ── Orkestrasyon zinciri başlat ──
  const handleStartChain = useCallback(async (chainId: string, input: string) => {
    if (!input.trim()) return
    try {
      const res = await fetch("/api/orchestration/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain_id: chainId, user_input: input.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrchPolling(true)
        setShowChainPicker(false)
        setCommand("")
        // Durumu hemen sorgula
        pollOrchStatus(data.execution_id)
      }
    } catch {
      // Hata sessiz
    }
  }, [pollOrchStatus])

  // Polling temizliği
  useEffect(() => {
    return () => {
      if (orchPollRef.current) clearInterval(orchPollRef.current)
    }
  }, [])

  // ── Sohbet mesajı gönder (Beyin Takımı) ──
  const handleChatSend = useCallback(async () => {
    const text = command.trim()
    if (!text || chatSending) return

    // Prefix kontrolü: komut:/görev: → CELF pipeline, uygula: → uygulama
    const lowerText = text.toLowerCase()
    if (lowerText.startsWith('komut:') || lowerText.startsWith('görev:')) {
      // Komut moduna geç ve CELF'e gönder
      const cmdText = text.replace(/^(komut:|görev:)\s*/i, '')
      setCommand(cmdText)
      setChatMode('command')
      return
    }
    if (lowerText.startsWith('uygula:')) {
      const applyText = text.replace(/^uygula:\s*/i, '')
      addMessage('patron', applyText, 'approval')
      setCommand('')
      addMessage('system', 'Uygulama komutu alındı. Lütfen ilgili görevi onaylayın.', 'result')
      return
    }

    // Normal sohbet → Beyin Takımı
    addMessage('patron', text, 'chat')
    setCommand('')
    setChatSending(true)

    try {
      const currentPatronMsg = { role: 'patron' as const, content: text }
      const historyForApi = [...messages.slice(-19).map((m) => ({
        role: m.role,
        content: m.content,
      })), currentPatronMsg]

      const res = await fetch('/api/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyForApi,
          mode: 'chat',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        addMessage('brain-team', data.reply ?? 'Yanıt alınamadı.', 'chat', {
          suggestions: data.suggestions,
        })
      } else {
        addMessage('system', 'Beyin Takımı yanıt veremedi. Tekrar deneyin.', 'result')
      }
    } catch {
      addMessage('system', 'Bağlantı hatası. Tekrar deneyin.', 'result')
    } finally {
      setChatSending(false)
    }
  }, [command, chatSending, messages, addMessage])


  // ── Onizleme dialog'unu ac ──
  const handleOpenPreview = useCallback((task: CelfTask) => {
    const previewData: CelfTaskForPreview = {
      id: task.id,
      directorate: task.directorate,
      task_description: task.task_description,
      status: task.status,
      output_type: task.output_type,
      output_result: task.output_result,
      rejection_reason: task.rejection_reason,
      exec_status: task.exec_status,
      created_at: task.created_at,
    }
    setPreviewTask(previewData)
    setPreviewEpicCommand(activeEpic?.patron_command || "")
    setPreviewDialogOpen(true)
  }, [activeEpic?.patron_command])

  // ── Dialog icinden onayla ──
  const handleDialogApprove = useCallback(async (taskId: string) => {
    await handleApprove(taskId)
  }, [handleApprove])

  // ── Dialog icinden reddet ──
  const handleDialogReject = useCallback(async (taskId: string, reason: string) => {
    try {
      await fetch(`/api/celf/tasks/reject/${taskId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      mutate("/api/celf/tasks/board")
    } catch {
      // Hata sessiz
    }
  }, [])

  // ── Dialog icinden duzelt ──
  const handleDialogEdit = useCallback(async (_taskId: string, correctionText: string) => {
    const originalCommand = previewEpicCommand
    const newCommand = `${originalCommand}\n\nDUZELTME: ${correctionText}`
    try {
      await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: newCommand, auto_execute: true }),
      })
      mutate("/api/celf/tasks/board")
    } catch {
      // Hata sessiz
    }
  }, [previewEpicCommand])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = "auto"
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px"
    }
  }, [command])

  // Birleşik gönder: moduna göre yönlendir
  const handleUnifiedSend = useCallback(() => {
    if (chatMode === 'chat') {
      handleChatSend()
    } else {
      handleSend()
    }
  }, [chatMode, handleChatSend, handleSend])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ═══════ MOD SEÇİCİ ═══════ */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={chatMode === 'command' ? 'default' : 'outline'}
          onClick={() => setChatMode('command')}
          className={chatMode === 'command'
            ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-mono text-xs'
            : 'border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#8b5cf6]/40 font-mono text-xs'
          }
        >
          <Terminal className="w-3.5 h-3.5 mr-1" />
          Komut
        </Button>
        <Button
          size="sm"
          variant={chatMode === 'chat' ? 'default' : 'outline'}
          onClick={() => setChatMode('chat')}
          className={chatMode === 'chat'
            ? 'bg-[#06b6d4] hover:bg-[#0891b2] text-white font-mono text-xs'
            : 'border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#06b6d4]/40 font-mono text-xs'
          }
        >
          <MessageCircle className="w-3.5 h-3.5 mr-1" />
          Sohbet
        </Button>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([])
              localStorage.removeItem(CHAT_STORAGE_KEY)
            }}
            className="ml-auto text-[8px] font-mono text-[#8892a8] hover:text-[#ef4444] transition-colors"
          >
            Sohbeti Temizle
          </button>
        )}
      </div>

      {/* ═══════ PIPELINE STEPPER ═══════ */}
      {pipeline.stage !== "idle" && (
        <div className="rounded-xl border border-[#2a3650] bg-[#0a0e17]/80 p-4">
          <div className="flex items-center gap-3">
            <PipelineStepper
              currentStage={pipeline.stage}
              completedStages={pipeline.completedStages}
            />
            {pipeline.stageLabel && (
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded-full animate-pulse ml-auto"
                style={{
                  backgroundColor: (PIPELINE_STAGES.find((s) => s.key === pipeline.stage)?.color ?? "#8892a8") + "15",
                  color: PIPELINE_STAGES.find((s) => s.key === pipeline.stage)?.color ?? "#8892a8",
                }}
              >
                {pipeline.stageLabel}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══════ SOHBET BALONCUKLARI ═══════ */}
      {chatMode === 'chat' && messages.length > 0 && (
        <div className="rounded-xl border border-[#2a3650] bg-[#0a0e17]/80 p-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'patron' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-xs font-mono ${
                    msg.role === 'patron'
                      ? 'bg-[#8b5cf6]/15 border border-[#8b5cf6]/30 text-[#e2e8f0]'
                      : msg.role === 'brain-team'
                        ? 'bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#e2e8f0]'
                        : 'bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b]'
                  } ${msg.type === 'command' ? 'border-[#f59e0b]/40' : ''}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[8px] font-bold tracking-wider uppercase ${
                      msg.role === 'patron' ? 'text-[#8b5cf6]'
                        : msg.role === 'brain-team' ? 'text-[#06b6d4]'
                          : 'text-[#f59e0b]'
                    }`}>
                      {msg.role === 'patron' ? 'PATRON' : msg.role === 'brain-team' ? 'BEYİN TAKIMI' : 'SİSTEM'}
                    </span>
                    <span className="text-[7px] text-[#8892a8]">
                      {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  {/* Öneri butonları */}
                  {msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.metadata.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setCommand(s)}
                          className="text-[8px] font-mono px-2 py-1 rounded border border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/10 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatSending && (
              <div className="flex justify-start">
                <div className="bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-xl px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06b6d4]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* ═══════ KOMUT / SOHBET GİRİŞ ALANI ═══════ */}
      <div className="rounded-xl border border-[#2a3650] bg-[#0a0e17]/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${chatMode === 'chat' ? 'bg-[#06b6d4]' : 'bg-[#8b5cf6]'}`} />
          <span className={`text-xs font-bold tracking-widest uppercase font-mono ${chatMode === 'chat' ? 'text-[#06b6d4]' : 'text-[#8b5cf6]'}`}>
            {chatMode === 'chat' ? 'ASK — Sohbet Modu' : 'ASK — CELF Komut Merkezi'}
          </span>
          {(stats?.running ?? 0) > 0 && (
            <Badge className="bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20 text-[7px] font-mono animate-pulse ml-auto">
              {stats?.running ?? 0} CALISIYOR
            </Badge>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleUnifiedSend()
          }}
          placeholder={chatMode === 'chat'
            ? 'Beyin Takımı ile sohbet et... (komut: veya görev: ile komut moduna geç)'
            : "CELF'e komut yaz... (Ctrl+Enter ile gonder)"
          }
          rows={3}
          className={`w-full bg-[#060a13] border rounded-lg px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#8892a8] focus:outline-none transition-colors font-mono resize-none min-h-[80px] ${
            chatMode === 'chat' ? 'border-[#06b6d4]/20 focus:border-[#06b6d4]/40' : 'border-[#2a3650] focus:border-[#8b5cf6]/40'
          }`}
        />

        <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleVoice}
              disabled={isListening}
              className={`border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#8b5cf6]/40 min-h-[44px] min-w-[44px] ${isListening ? "border-[#ef4444]/40 text-[#ef4444] animate-pulse" : ""}`}
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline ml-1 text-xs">{isListening ? "Dinliyor..." : "Ses"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#8b5cf6]/40 min-h-[44px] min-w-[44px]"
            >
              <FileUp className="w-4 h-4" />
              <span className="hidden sm:inline ml-1 text-xs">Dosya</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTemplates(!showTemplates)}
              className={`border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#8b5cf6]/40 min-h-[44px] min-w-[44px] ${showTemplates ? "border-[#8b5cf6]/40 text-[#8b5cf6]" : ""}`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span className="hidden sm:inline ml-1 text-xs">Sablon</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowChainPicker(!showChainPicker)}
              className={`border-[#2a3650] text-[#8892a8] hover:text-[#e2e8f0] hover:border-[#10b981]/40 min-h-[44px] min-w-[44px] ${showChainPicker ? "border-[#10b981]/40 text-[#10b981]" : ""}`}
            >
              <Workflow className="w-4 h-4" />
              <span className="hidden sm:inline ml-1 text-xs">Zincir</span>
            </Button>
          </div>

          <Button
            onClick={handleUnifiedSend}
            disabled={!command.trim() || sending || chatSending}
            className={`font-bold px-6 min-h-[44px] disabled:opacity-30 ${
              chatMode === 'chat'
                ? 'bg-[#06b6d4] hover:bg-[#0891b2] text-white'
                : 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white'
            }`}
          >
            {(sending || chatSending) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" />
                {chatMode === 'chat' ? 'Gönder' : 'Gönder'}
              </>
            )}
          </Button>
        </div>

        {/* Sablon listesi */}
        {showTemplates && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => {
                  setCommand(t)
                  setShowTemplates(false)
                }}
                className="text-left text-xs font-mono px-3 py-2 rounded border border-[#2a3650] hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/05 text-[#8892a8] hover:text-[#e2e8f0] transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Zincir secici */}
        {showChainPicker && chainData?.chains && (
          <div className="mt-3 space-y-2">
            <div className="text-[10px] font-mono font-bold text-[#10b981] tracking-wider">
              ORKESTRASYON ZİNCİRLERİ
            </div>
            {chainData.chains.map((chain) => (
              <button
                key={chain.chain_id}
                onClick={() => {
                  if (command.trim()) {
                    handleStartChain(chain.chain_id, command)
                  }
                }}
                disabled={!command.trim()}
                className="w-full text-left px-3 py-3 rounded-lg border border-[#2a3650] hover:border-[#10b981]/40 hover:bg-[#10b981]/05 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Workflow className="w-3.5 h-3.5 text-[#10b981]" />
                  <span className="text-xs font-mono font-bold text-[#10b981]">
                    {chain.name}
                  </span>
                </div>
                <p className="text-[10px] text-[#8892a8] font-mono mb-2">
                  {chain.description}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {chain.steps.map((step, idx) => (
                    <span key={step.step_id} className="flex items-center gap-1">
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#2a3650]/40 text-[#e2e8f0]">
                        {step.agent_id.toUpperCase()}
                      </span>
                      {idx < chain.steps.length - 1 && (
                        <span className="text-[8px] text-[#8892a8]">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {!command.trim() && (
              <p className="text-[9px] text-[#f59e0b] font-mono">
                Zincir başlatmak için önce komut alanına talimatınızı yazın.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══════ ÖNİZLEME PANELİ ═══════ */}
      {preview && (
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4">
          <div className="text-[10px] font-mono font-bold text-[#f59e0b] tracking-wider mb-3">
            ÖNİZLEME — ONAY BEKLİYOR
          </div>
          <p className="text-sm text-[#e2e8f0] mb-3">
            Bu komut şu direktörlüklere gidecek:
          </p>
          <div className="space-y-2 mb-4">
            {preview.tasks.map((t, i) => {
              const dirConfig = DIREKTORLUKLER.find((d) => d.code === t.directorate)
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a3650]/60 bg-[#0a0e17]/60">
                  {dirConfig && (
                    <dirConfig.icon className="w-4 h-4 flex-shrink-0" style={{ color: dirConfig.neonColor }} />
                  )}
                  <span className="text-[10px] font-mono font-bold" style={{ color: dirConfig?.neonColor ?? "#8892a8" }}>
                    {dirConfig?.shortName ?? t.directorate}
                  </span>
                  <span className="flex-1 text-[10px] text-[#e2e8f0] truncate">
                    {t.task_description}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleConfirmPreview}
              disabled={confirming}
              className="bg-[#10b981] hover:bg-[#059669] text-white font-bold px-6 min-h-[44px]"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Onaylanıyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Onayla
                </>
              )}
            </Button>
            <Button
              onClick={handleRejectPreview}
              variant="outline"
              className="border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10 min-h-[44px]"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reddet
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ ORKESTRASYON ZİNCİR İLERLEMESİ ═══════ */}
      {orchExecution && (
        <div className={`rounded-xl border p-4 ${
          orchExecution.status === "completed"
            ? "border-[#10b981]/30 bg-[#10b981]/05"
            : orchExecution.status === "failed"
            ? "border-[#ef4444]/30 bg-[#ef4444]/05"
            : "border-[#3b82f6]/30 bg-[#3b82f6]/05"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Workflow className={`w-4 h-4 ${
                orchExecution.status === "completed" ? "text-[#10b981]" :
                orchExecution.status === "failed" ? "text-[#ef4444]" :
                "text-[#3b82f6]"
              }`} />
              <span className="text-xs font-bold tracking-widest uppercase font-mono" style={{
                color: orchExecution.status === "completed" ? "#10b981" :
                       orchExecution.status === "failed" ? "#ef4444" : "#3b82f6"
              }}>
                {orchExecution.chain_name} — {orchExecution.status === "running" ? "CALISIYOR" :
                  orchExecution.status === "completed" ? "TAMAMLANDI" :
                  orchExecution.status === "failed" ? "BASARISIZ" : orchExecution.status.toUpperCase()}
              </span>
            </div>
            <Badge className="text-[7px] font-mono bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20">
              {orchExecution.completed_steps}/{orchExecution.total_steps} ADIM
            </Badge>
          </div>

          {/* İlerleme çubuğu */}
          <div className="w-full h-1.5 bg-[#2a3650] rounded-full mb-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${orchExecution.total_steps > 0 ? (orchExecution.completed_steps / orchExecution.total_steps) * 100 : 0}%`,
                background: orchExecution.status === "completed" ? "#10b981" :
                           orchExecution.status === "failed" ? "#ef4444" : "#3b82f6",
              }}
            />
          </div>

          {/* Adımlar */}
          <div className="space-y-2">
            {orchExecution.steps.map((step) => {
              const OutputIcon = outputTypeIcon(step.output_type)
              return (
                <div
                  key={step.step_id}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    step.status === "running" ? "border-[#3b82f6]/40 bg-[#3b82f6]/05" :
                    step.status === "completed" ? "border-[#10b981]/30 bg-[#10b981]/05" :
                    step.status === "failed" ? "border-[#ef4444]/30 bg-[#ef4444]/05" :
                    "border-[#2a3650]/40"
                  }`}
                >
                  {/* Durum ikonu */}
                  <div className="mt-0.5">
                    {step.status === "running" ? (
                      <Loader2 className="w-4 h-4 text-[#3b82f6] animate-spin" />
                    ) : step.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    ) : step.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-[#ef4444]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#8892a8]" />
                    )}
                  </div>

                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold text-[#e2e8f0]">
                        {step.label}
                      </span>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#2a3650]/60 text-[#8892a8]">
                        {step.agent_id.toUpperCase()}
                      </span>
                      <OutputIcon className="w-3 h-3 text-[#8892a8]" />
                    </div>

                    {/* Çıktı önizlemesi */}
                    {step.status === "completed" && step.output && (
                      <div className="bg-[#060a13] rounded-lg p-2 border border-[#2a3650]/40 max-h-[120px] overflow-y-auto mt-1">
                        {step.output_url && (step.output_type === "image" || step.output_type === "video") ? (
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-[#10b981]" />
                            <a
                              href={step.output_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-[#3b82f6] underline truncate"
                            >
                              {step.output_url}
                            </a>
                          </div>
                        ) : (
                          <pre className="text-[9px] text-[#e2e8f0] font-mono whitespace-pre-wrap break-words">
                            {step.output.length > 300 ? step.output.slice(0, 300) + "..." : step.output}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Hata mesajı */}
                    {step.status === "failed" && step.error && (
                      <div className="mt-1 px-2 py-1 rounded border border-[#ef4444]/20 bg-[#ef4444]/05">
                        <span className="text-[8px] font-mono text-[#ef4444]">
                          HATA: {step.error}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Zincir tamamlandıysa kapat butonu */}
          {(orchExecution.status === "completed" || orchExecution.status === "failed") && (
            <div className="flex justify-end mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOrchExecution(null)}
                className="border-[#2a3650] text-[#8892a8] text-[10px] font-mono"
              >
                Kapat
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ AKTIF DIREKTORLUKLER CHIP'LERI ═══════ */}
      <div className="rounded-xl border border-[#2a3650] bg-[#0a0e17]/80 p-4">
        <div className="text-[10px] font-mono font-bold text-[#8892a8] tracking-wider mb-3">
          AKTIF DIREKTORLUKLER
        </div>
        <div className="flex flex-wrap gap-2">
          {DIREKTORLUKLER.map((d) => {
            const isActive = activeDirectorates.has(d.code)
            const tasks = activeEpic?.tasksFlat?.filter((t) => t.directorate === d.code) ?? []
            const taskStatus = tasks[0]?.status || tasks[0]?.exec_status

            let statusColor = d.neonColor + "20"
            let textColor = d.neonColor + "60"
            if (isActive) {
              statusColor = d.neonColor + "25"
              textColor = d.neonColor
            }

            return (
              <div
                key={d.code}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isActive ? "border-opacity-40" : "border-opacity-10 opacity-40"}`}
                style={{ borderColor: textColor, background: statusColor }}
              >
                <d.icon className="w-3.5 h-3.5" style={{ color: textColor }} />
                <span className="text-[10px] font-mono font-bold" style={{ color: textColor }}>
                  {d.shortName}
                </span>
                {isActive && taskStatus && (
                  <span
                    className="text-[7px] font-mono px-1 py-px rounded"
                    style={{
                      color: STATE_CONFIG[taskStatus]?.color || "#8892a8",
                      background: (STATE_CONFIG[taskStatus]?.color || "#8892a8") + "15",
                    }}
                  >
                    {STATE_CONFIG[taskStatus]?.label || taskStatus}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════ DIREKTORLUK DURUM SATIRLARI ═══════ */}
      {activeEpic && activeEpic.tasksFlat?.length > 0 && (
        <div className="rounded-xl border border-[#2a3650] bg-[#0a0e17]/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono font-bold text-[#8892a8] tracking-wider">
              GOREV DURUMU — {activeEpic.patron_command?.slice(0, 50)}
              {(activeEpic.patron_command?.length ?? 0) > 50 ? "..." : ""}
            </div>
            <Badge className="text-[7px] font-mono bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20">
              {activeEpic.completed_tasks}/{activeEpic.total_tasks} TAMAMLANDI
            </Badge>
          </div>

          <div className="space-y-2">
            {activeEpic.tasksFlat.map((task) => {
              const dirConfig = DIREKTORLUKLER.find((d) => d.code === task.directorate)
              const stateKey = task.status || task.exec_status || "queued"
              const state = STATE_CONFIG[stateKey] || STATE_CONFIG.queued
              const StateIcon = state.icon

              return (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => handleOpenPreview(task)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#2a3650]/60 hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/05 transition-all cursor-pointer text-left group"
                >
                  {/* Direktorluk bilgisi */}
                  <div className="flex items-center gap-2 min-w-[100px]">
                    {dirConfig && (
                      <dirConfig.icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: dirConfig.neonColor }}
                      />
                    )}
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{ color: dirConfig?.neonColor || "#8892a8" }}
                    >
                      {dirConfig?.shortName || task.directorate}
                    </span>
                  </div>

                  {/* Gorev aciklamasi */}
                  <span className="flex-1 text-[10px] text-[#e2e8f0] truncate">
                    {task.task_description || "—"}
                  </span>

                  {/* Durum + Onizleme ikonu */}
                  <div className="flex items-center gap-1.5">
                    <StateIcon
                      className={`w-3.5 h-3.5 ${stateKey === "running" ? "animate-spin" : ""}`}
                      style={{ color: state.color }}
                    />
                    <span className="text-[8px] font-mono font-bold" style={{ color: state.color }}>
                      {state.label}
                    </span>
                    {(task.output_result || task.status === "completed") && (
                      <Eye className="w-3.5 h-3.5 text-[#8b5cf6] ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════ ONIZLEME KUTUSU — ONAY BEKLIYOR ═══════ */}
      {activeEpic?.tasksFlat?.some(
        (t) => t.status === "completed" || t.exec_status === "completed"
      ) && (
        <div className="rounded-xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/05 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs font-bold tracking-widest text-[#8b5cf6] uppercase font-mono">
              Onizleme — Onay Bekliyor
            </span>
          </div>

          <div className="space-y-3">
            {activeEpic.tasksFlat
              .filter(
                (t) =>
                  t.status === "completed" || t.exec_status === "completed"
              )
              .map((task) => {
                const dirConfig = DIREKTORLUKLER.find(
                  (d) => d.code === task.directorate
                )
                const output = task.output_result
                const isRejecting = rejectingTaskId === task.id
                const isEditing = editTaskId === task.id

                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-[#2a3650] bg-[#0a0e17]/80 p-3"
                  >
                    {/* Baslik */}
                    <div className="flex items-center gap-2 mb-2">
                      {dirConfig && (
                        <dirConfig.icon
                          className="w-4 h-4"
                          style={{ color: dirConfig.neonColor }}
                        />
                      )}
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{ color: dirConfig?.neonColor || "#8892a8" }}
                      >
                        {dirConfig?.shortName || task.directorate}
                      </span>
                      <span className="text-[8px] text-[#8892a8] font-mono ml-auto">
                        {task.output_type || "text"}
                      </span>
                    </div>

                    {/* Output render - tiklanabilir onizleme */}
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(task)}
                      className="w-full text-left bg-[#060a13] rounded-lg p-3 mb-3 border border-[#2a3650]/40 max-h-[200px] overflow-y-auto hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/05 transition-all cursor-pointer group relative"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#8b5cf6]/20 text-[#8b5cf6]">
                          <Eye className="w-3 h-3" />
                          <span className="text-[8px] font-mono">Onizle</span>
                        </div>
                      </div>
                      {output ? (
                        <pre className="text-[10px] text-[#e2e8f0] font-mono whitespace-pre-wrap break-words">
                          {typeof output === "string"
                            ? output
                            : JSON.stringify(output, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-[10px] text-[#8892a8] font-mono">
                          Cikti bekleniyor...
                        </span>
                      )}
                    </button>

                    {/* Red sebebi textarea */}
                    {isRejecting && (
                      <div className="mb-3">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Red sebebini yazin..."
                          rows={2}
                          className="w-full bg-[#060a13] border border-[#ef4444]/30 rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#8892a8] focus:outline-none focus:border-[#ef4444]/60 font-mono resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleReject(task.id)}
                            disabled={!rejectReason.trim()}
                            className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-[10px] font-mono"
                          >
                            Reddi Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectingTaskId(null)
                              setRejectReason("")
                            }}
                            className="border-[#2a3650] text-[#8892a8] text-[10px] font-mono"
                          >
                            Vazgec
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Duzelt textarea */}
                    {isEditing && (
                      <div className="mb-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Ek talimat yazin..."
                          rows={2}
                          className="w-full bg-[#060a13] border border-[#f59e0b]/30 rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#8892a8] focus:outline-none focus:border-[#f59e0b]/60 font-mono resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleEdit(activeEpic?.patron_command || "")
                            }
                            disabled={!editText.trim() || sending}
                            className="bg-[#f59e0b] hover:bg-[#d97706] text-black text-[10px] font-mono"
                          >
                            {sending ? "Gönderiliyor..." : "Düzelt & Gönder"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditTaskId(null)
                              setEditText("")
                            }}
                            className="border-[#2a3650] text-[#8892a8] text-[10px] font-mono"
                          >
                            Vazgec
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Aksiyon butonlari */}
                    {!isRejecting && !isEditing && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditTaskId(task.id)
                            setEditText("")
                          }}
                          className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 text-[10px] font-mono min-h-[40px]"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Duzelt
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleApprove(task.id)}
                          className="bg-[#10b981] hover:bg-[#059669] text-white text-[10px] font-mono min-h-[40px]"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                          Onayla & Uygula
                        </Button>


                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingTaskId(task.id)
                            setRejectReason("")
                          }}
                          className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 text-[10px] font-mono min-h-[40px]"
                        >
                          <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                          Reddet
                        </Button>
                      </div>
                    )}

                    {/* Reddedilmis gorevler icin red sebebi goster */}
                    {task.rejection_reason && (
                      <div className="mt-2 px-3 py-2 rounded border border-[#ef4444]/20 bg-[#ef4444]/05">
                        <span className="text-[8px] font-mono text-[#ef4444]">
                          RED SEBEBI: {task.rejection_reason}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ═══════ EPIC GECMISI ═══════ */}
      {epics.length > 1 && (
        <div className="rounded-xl border border-[#2a3650] bg-[#0a0e17]/80 p-4">
          <div className="text-[10px] font-mono font-bold text-[#8892a8] tracking-wider mb-3">
            KOMUT GECMISI
          </div>
          <div className="space-y-1.5">
            {epics.slice(0, 10).map((epic) => (
              <button
                key={epic.id}
                onClick={() => setSelectedEpicId(epic.id)}
                className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${selectedEpicId === epic.id ? "border-[#8b5cf6]/40 bg-[#8b5cf6]/05" : "border-[#2a3650]/40 hover:border-[#2a3650]"}`}
              >
                <span className="text-[9px] text-[#e2e8f0] flex-1 truncate font-mono">
                  {epic.patron_command?.slice(0, 60)}
                  {(epic.patron_command?.length ?? 0) > 60 ? "..." : ""}
                </span>
                <Badge
                  className="text-[7px] font-mono"
                  style={{
                    color: STATE_CONFIG[epic.status]?.color || "#8892a8",
                    background:
                      (STATE_CONFIG[epic.status]?.color || "#8892a8") + "15",
                    borderColor:
                      (STATE_CONFIG[epic.status]?.color || "#8892a8") + "30",
                  }}
                >
                  {epic.completed_tasks}/{epic.total_tasks}
                </Badge>
                <span className="text-[7px] text-[#8892a8] font-mono">
                  {new Date(epic.created_at).toLocaleDateString("tr-TR")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* ═══════ CELF ONIZLEME DIALOG ═══════ */}
      <CelfPreviewDialog
        task={previewTask}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        onApprove={handleDialogApprove}
        onReject={handleDialogReject}
        onEdit={handleDialogEdit}
      />
    </div>
  )
}
