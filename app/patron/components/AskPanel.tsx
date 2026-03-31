"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

type PreviewTaskItem = {
  directorate: string
  ai_provider: string
  task_description: string
}

type TaskItem = {
  id: string
  directorate: string
  ai_provider: string
  task_description: string
  status?: string
  output_result?: Record<string, unknown>
  output_type?: string
  apply_status?: string
}

type EpicState = {
  epicId: string
  command: string
  tasks: TaskItem[]
  approval_status?: string
  status?: string
}

type PreviewState = {
  command: string
  tasks: PreviewTaskItem[]
}

const APPROVAL_LABEL: Record<string, string> = {
  preparing: "HAZIRLANIYOR",
  approval_pending: "ONAY_BEKLİYOR",
  approved: "ONAYLANDI",
  rejected: "REDDEDİLDİ",
}

export default function AskPanel() {
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [epic, setEpic] = useState<EpicState | null>(null)
  const [fixText, setFixText] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [applying, setApplying] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Önizleme modu: confirmed=false ile parse sonucunu al
  const sendCommand = useCallback(
    async (cmd: string) => {
      if (!cmd.trim()) return
      setLoading(true)
      try {
        const res = await fetch("/api/celf/tasks/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd.trim(), confirmed: false }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast({ title: "Hata", description: data?.error ?? "Komut gönderilemedi", variant: "destructive" })
          return
        }
        if (data.preview) {
          setPreview({ command: cmd.trim(), tasks: (data.tasks ?? []) as PreviewTaskItem[] })
          toast({ title: "Önizleme", description: `${(data.tasks ?? []).length} direktörlüğe görev atanacak` })
        } else {
          const epicId = data.epicId
          const tasks = (data.tasks ?? []) as TaskItem[]
          setEpic({ epicId, command: cmd.trim(), tasks })
          setPreview(null)
          setFixText("")
          setRejectReason("")
          toast({ title: "Komut alındı", description: `${tasks.length} görev oluşturuldu` })
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Onayla: confirmed=true ile gerçek INSERT
  const confirmPreview = useCallback(async () => {
    if (!preview || confirming) return
    setConfirming(true)
    try {
      const res = await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: preview.command, confirmed: true, auto_execute: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Hata", description: data?.error ?? "Onaylanamadı", variant: "destructive" })
        return
      }
      const epicId = data.epicId
      const tasks = (data.tasks ?? []) as TaskItem[]
      setEpic({ epicId, command: preview.command, tasks })
      setPreview(null)
      setFixText("")
      setRejectReason("")
      toast({ title: "Onaylandı", description: `${tasks.length} görev oluşturuldu ve çalıştırılıyor` })
      // Refresh board data
      const boardRes = await fetch(`/api/celf/tasks/board?epicId=${epicId}`)
      const boardData = await boardRes.json().catch(() => ({}))
      const epics = boardData?.epics ?? []
      const e = epics.find((x: { id: string }) => x.id === epicId)
      if (e) {
        setEpic((prev) => {
          if (!prev || prev.epicId !== epicId) return prev
          return { epicId: prev.epicId, command: prev.command, tasks: e.tasksFlat ?? prev.tasks, approval_status: e.approval_status, status: e.status }
        })
      }
    } finally {
      setConfirming(false)
    }
  }, [preview, confirming])

  const rejectPreview = useCallback(() => {
    setPreview(null)
  }, [])

  const handleSend = () => sendCommand(command)

  const handleFix = () => {
    const newCmd = epic?.command
      ? `${epic.command}\n\nDüzeltme: ${fixText.trim()}`
      : fixText.trim()
    if (newCmd) sendCommand(newCmd)
  }

  const handleApprove = async () => {
    if (!epic?.epicId) return
    setApplying(true)
    try {
      for (const t of epic.tasks) {
        if (t.output_result && Object.keys(t.output_result).length > 0) {
          await fetch(`/api/celf/tasks/apply/${t.id}`, { method: "POST" })
        }
      }
      const res = await fetch(`/api/celf/tasks/epic/${epic.epicId}/approve`, { method: "POST" })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast({ title: "Hata", description: d?.error ?? "Onaylanamadı", variant: "destructive" })
        return
      }
      setEpic((prev) => (prev ? { ...prev, approval_status: "approved" } : null))
      toast({ title: "Onaylandı", description: "Görevler uygulandı" })
    } finally {
      setApplying(false)
    }
  }

  const handleReject = async () => {
    if (!epic?.epicId) return
    setApplying(true)
    try {
      const res = await fetch(`/api/celf/tasks/epic/${epic.epicId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: rejectReason.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast({ title: "Hata", description: d?.error ?? "Reddedilemedi", variant: "destructive" })
        return
      }
      setEpic((prev) => (prev ? { ...prev, approval_status: "rejected" } : null))
      toast({ title: "Reddedildi", variant: "destructive" })
    } finally {
      setApplying(false)
    }
  }

  const refreshEpic = useCallback(async () => {
    if (!epic?.epicId) return
    const boardRes = await fetch(`/api/celf/tasks/board?epicId=${epic.epicId}`)
    const boardData = await boardRes.json().catch(() => ({}))
    const e = (boardData?.epics ?? []).find((x: { id: string }) => x.id === epic.epicId)
    if (e) {
      setEpic((prev) => {
        if (!prev || prev.epicId !== epic.epicId) return prev
        return {
          epicId: prev.epicId,
          command: prev.command,
          tasks: e.tasksFlat ?? prev.tasks,
          approval_status: e.approval_status,
          status: e.status,
        }
      })
    }
  }, [epic?.epicId])

  const approvalStatus = epic?.approval_status ?? "preparing"
  const canApprove = approvalStatus === "approval_pending"
  const isDone = approvalStatus === "approved" || approvalStatus === "rejected"

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl font-bold text-[#e2e8f0] font-mono">ASK</h2>

      <div>
        <label className="block text-sm text-[#8892a8] mb-1">Komut</label>
        <textarea
          className="w-full min-h-[120px] rounded-lg border border-[#0f3460]/40 bg-[#0a0e17] text-[#e2e8f0] p-3 font-mono text-sm resize-y"
          placeholder="CELF direktörlüklerine komut yazın..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          disabled={loading}
        />
        <Button
          className="mt-2 bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30"
          onClick={handleSend}
          disabled={loading || !command.trim()}
        >
          Gönder
        </Button>
      </div>

      {preview && (
        <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4">
          <p className="text-xs font-mono text-[#f59e0b] mb-2">ÖNİZLEME — Bu komut şu direktörlüklere gidecek:</p>
          <div className="space-y-1 mb-3">
            {preview.tasks.map((t, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 px-2 rounded bg-[#0a0e17]/80 text-sm">
                <span className="font-mono text-[#e2e8f0]">{t.directorate}</span>
                <span className="text-[#8892a8] text-xs truncate ml-2 max-w-[60%]">{t.task_description.slice(0, 80)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30"
              onClick={confirmPreview}
              disabled={confirming}
            >
              {confirming ? "Onaylanıyor..." : "Onayla"}
            </Button>
            <Button
              variant="destructive"
              onClick={rejectPreview}
            >
              Reddet
            </Button>
          </div>
        </div>
      )}

      {epic && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[#8892a8]">Aktif direktörlükler:</span>
            {[...new Set(epic.tasks.map((t) => t.directorate))].map((d) => (
              <span
                key={d}
                className="px-2 py-1 rounded-md bg-[#0f3460]/40 text-[#00d4ff]/90 text-xs font-mono"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm">
              <span className="text-[#8892a8]">CELF durum: </span>
              <span className="font-mono text-[#e2e8f0]">
                {APPROVAL_LABEL[approvalStatus] ?? approvalStatus}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-[#8892a8]" onClick={refreshEpic}>
              Yenile
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-[#8892a8]">Direktörlük durumları</p>
            {epic.tasks.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center py-1.5 px-2 rounded bg-[#0a0e17]/80 text-sm"
              >
                <span className="font-mono text-[#e2e8f0]">{t.directorate}</span>
                <span className="text-[#8892a8]">
                  {t.status === "completed"
                    ? "tamamlandı"
                    : t.status === "running"
                      ? "çalışıyor"
                      : t.status === "failed"
                        ? "başarısız"
                        : "bekliyor"}
                </span>
              </div>
            ))}
          </div>

          {epic.tasks.some((t) => t.output_result && Object.keys(t.output_result).length > 0) && (
            <div className="rounded-lg border border-[#0f3460]/40 bg-[#0a0e17] p-4">
              <p className="text-xs text-[#8892a8] mb-2">Önizleme (CELF output_result)</p>
              <pre className="text-xs text-[#e2e8f0] font-mono overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
                {JSON.stringify(
                  epic.tasks
                    .filter((t) => t.output_result && Object.keys(t.output_result).length > 0)
                    .map((t) => ({ directorate: t.directorate, output_type: t.output_type, output_result: t.output_result })),
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {!isDone && (
            <>
              <div>
                <label className="block text-sm text-[#8892a8] mb-1">Düzelt (ek metin)</label>
                <textarea
                  className="w-full min-h-[60px] rounded-lg border border-[#0f3460]/40 bg-[#0a0e17] text-[#e2e8f0] p-2 text-sm"
                  placeholder="Ek açıklama veya düzeltme..."
                  value={fixText}
                  onChange={(e) => setFixText(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="mt-1 border-[#0f3460]/40 text-[#e2e8f0] hover:bg-[#0f3460]/20"
                  onClick={handleFix}
                  disabled={loading || !fixText.trim()}
                >
                  Düzelt
                </Button>
              </div>

              {canApprove && (
                <>
                  <div className="flex gap-2">
                    <Button
                      className="bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30"
                      onClick={handleApprove}
                      disabled={applying}
                    >
                      Onayla & Uygula
                    </Button>
                    <div className="flex-1 flex gap-2 items-start">
                      <textarea
                        className="flex-1 min-h-[36px] rounded border border-[#0f3460]/40 bg-[#0a0e17] text-[#e2e8f0] p-2 text-sm"
                        placeholder="Reddetme sebebi..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={applying}
                      >
                        Reddet
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
