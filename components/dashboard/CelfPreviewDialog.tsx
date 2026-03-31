"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import CelfOutputPreview from "./CelfOutputPreview"
import {
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Loader2,
  Calendar,
  Building2,
  Zap,
  Clock,
} from "lucide-react"

// ==================== TYPES ====================

export interface CelfTaskForPreview {
  id: string
  directorate: string
  ai_provider?: string
  task_description: string
  status: string
  output_type: string | null
  output_result: Record<string, unknown> | null
  rejection_reason?: string | null
  exec_status?: string
  created_at: string
  completed_at?: string | null
}

interface CelfPreviewDialogProps {
  task: CelfTaskForPreview | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove?: (taskId: string) => Promise<void>
  onReject?: (taskId: string, reason: string) => Promise<void>
  onEdit?: (taskId: string, editText: string) => Promise<void>
}

// ==================== HELPERS ====================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  queued: { label: "Kuyrukta", color: "#f59e0b" },
  running: { label: "Calisiyor", color: "#3b82f6" },
  executing: { label: "Yurutuluyor", color: "#3b82f6" },
  completed: { label: "Onay Bekliyor", color: "#8b5cf6" },
  approved: { label: "Onaylandi", color: "#10b981" },
  applied: { label: "Uygulandi", color: "#10b981" },
  rejected: { label: "Reddedildi", color: "#ef4444" },
  failed: { label: "Basarisiz", color: "#ef4444" },
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

// ==================== MAIN EXPORT ====================

export default function CelfPreviewDialog({
  task,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onEdit,
}: CelfPreviewDialogProps) {
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState("")
  const [loading, setLoading] = useState(false)

  const dirConfig = task
    ? DIREKTORLUKLER.find((d) => d.code === task.directorate)
    : null

  const statusKey = task?.status || task?.exec_status || "queued"
  const statusCfg = STATUS_CONFIG[statusKey] ?? { label: statusKey, color: "#8892a8" }

  const canApprove =
    statusKey === "completed" &&
    typeof onApprove === "function"
  const canReject =
    statusKey === "completed" &&
    typeof onReject === "function"
  const canEdit = typeof onEdit === "function"

  const handleApprove = useCallback(async () => {
    if (!task || !onApprove) return
    setLoading(true)
    try {
      await onApprove(task.id)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [task, onApprove, onOpenChange])

  const handleReject = useCallback(async () => {
    if (!task || !onReject || !rejectReason.trim()) return
    setLoading(true)
    try {
      await onReject(task.id, rejectReason.trim())
      setRejectMode(false)
      setRejectReason("")
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [task, onReject, rejectReason, onOpenChange])

  const handleEdit = useCallback(async () => {
    if (!task || !onEdit || !editText.trim()) return
    setLoading(true)
    try {
      await onEdit(task.id, editText.trim())
      setEditMode(false)
      setEditText("")
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [task, onEdit, editText, onOpenChange])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setRejectMode(false)
        setRejectReason("")
        setEditMode(false)
        setEditText("")
        setLoading(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 bg-[#0a0e17] border-[#2a3650] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-[#2a3650]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            {dirConfig && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: dirConfig.neonColor + "15",
                  borderWidth: 1,
                  borderColor: dirConfig.neonColor + "30",
                }}
              >
                <dirConfig.icon
                  className="w-4 h-4"
                  style={{ color: dirConfig.neonColor }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-mono font-bold text-[#e2e8f0] truncate">
                {task.task_description}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-mono text-[#8892a8] mt-0.5">
                {dirConfig?.name ?? task.directorate} — CELF Cikti Onizleme
              </DialogDescription>
            </div>
            <Badge
              className="text-[8px] font-mono font-bold flex-shrink-0"
              style={{
                color: statusCfg.color,
                backgroundColor: statusCfg.color + "15",
                borderColor: statusCfg.color + "30",
              }}
            >
              {statusCfg.label}
            </Badge>
          </div>
        </DialogHeader>

        {/* Body: Left details + Right preview */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Task details */}
          <div className="w-[280px] flex-shrink-0 border-r border-[#2a3650]/60 flex flex-col overflow-y-auto">
            <div className="p-4 flex flex-col gap-4">
              {/* Directorate info */}
              <div className="rounded-lg border border-[#2a3650]/60 bg-[#0f1420]/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-[#8892a8]" />
                  <span className="text-[9px] font-mono font-bold text-[#8892a8] uppercase tracking-wider">
                    Direktorluk
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {dirConfig && (
                    <dirConfig.icon
                      className="w-4 h-4"
                      style={{ color: dirConfig.neonColor }}
                    />
                  )}
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: dirConfig?.neonColor ?? "#e2e8f0" }}
                  >
                    {dirConfig?.shortName ?? task.directorate}
                  </span>
                </div>
                {dirConfig && (
                  <p className="text-[9px] font-mono text-[#8892a8] mt-1">
                    {dirConfig.description}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="rounded-lg border border-[#2a3650]/60 bg-[#0f1420]/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-[#8892a8]" />
                  <span className="text-[9px] font-mono font-bold text-[#8892a8] uppercase tracking-wider">
                    Durum
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusCfg.color }}
                  />
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                {task.ai_provider && (
                  <p className="text-[9px] font-mono text-[#8892a8] mt-1">
                    AI: {task.ai_provider}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="rounded-lg border border-[#2a3650]/60 bg-[#0f1420]/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-[#8892a8]" />
                  <span className="text-[9px] font-mono font-bold text-[#8892a8] uppercase tracking-wider">
                    Tarih
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[#8892a8]" />
                    <span className="text-[9px] font-mono text-[#cbd5e1]">
                      {formatDate(task.created_at)}
                    </span>
                  </div>
                  {task.completed_at && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-[#10b981]" />
                      <span className="text-[9px] font-mono text-[#10b981]">
                        {formatDate(task.completed_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Output type info */}
              <div className="rounded-lg border border-[#2a3650]/60 bg-[#0f1420]/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-[#8892a8]" />
                  <span className="text-[9px] font-mono font-bold text-[#8892a8] uppercase tracking-wider">
                    Cikti Tipi
                  </span>
                </div>
                <span className="text-xs font-mono text-[#e2e8f0]">
                  {task.output_type ?? "text"}
                </span>
              </div>

              {/* Task description */}
              <div className="rounded-lg border border-[#2a3650]/60 bg-[#0f1420]/60 p-3">
                <span className="text-[9px] font-mono font-bold text-[#8892a8] uppercase tracking-wider block mb-2">
                  Gorev Aciklamasi
                </span>
                <p className="text-[10px] font-mono text-[#cbd5e1] leading-relaxed">
                  {task.task_description}
                </p>
              </div>

              {/* Rejection reason if any */}
              {task.rejection_reason && (
                <div className="rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/05 p-3">
                  <span className="text-[9px] font-mono font-bold text-[#ef4444] uppercase tracking-wider block mb-1">
                    Red Sebebi
                  </span>
                  <p className="text-[10px] font-mono text-[#ef4444]/80">
                    {task.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <CelfOutputPreview
                output={task.output_result}
                outputType={task.output_type}
              />
            </div>
          </div>
        </div>

        {/* Footer: Action buttons */}
        <div className="flex-shrink-0 border-t border-[#2a3650]/60 px-6 py-3 bg-[#0f1420]/80">
          {/* Reject mode */}
          {rejectMode && (
            <div className="mb-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Red sebebini yazin..."
                rows={2}
                className="w-full bg-[#060a13] border border-[#ef4444]/30 rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#8892a8] focus:outline-none focus:border-[#ef4444]/60 font-mono resize-none"
              />
            </div>
          )}

          {/* Edit mode */}
          {editMode && (
            <div className="mb-3">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Ek talimat veya duzeltme yazin..."
                rows={2}
                className="w-full bg-[#060a13] border border-[#f59e0b]/30 rounded-lg px-3 py-2 text-xs text-[#e2e8f0] placeholder-[#8892a8] focus:outline-none focus:border-[#f59e0b]/60 font-mono resize-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* Approve button */}
            {canApprove && !rejectMode && !editMode && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={loading}
                className="bg-[#10b981] hover:bg-[#059669] text-white text-[10px] font-mono font-bold min-h-[40px] px-5"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                )}
                Onayla & Uygula
              </Button>
            )}

            {/* Edit button */}
            {canEdit && !rejectMode && !editMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditMode(true)
                  setEditText("")
                }}
                className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10 text-[10px] font-mono min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Duzelt
              </Button>
            )}

            {/* Reject button */}
            {canReject && !rejectMode && !editMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRejectMode(true)
                  setRejectReason("")
                }}
                className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 text-[10px] font-mono min-h-[40px]"
              >
                <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                Reddet
              </Button>
            )}

            {/* Reject confirm/cancel */}
            {rejectMode && (
              <>
                <Button
                  size="sm"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || loading}
                  className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-[10px] font-mono min-h-[40px]"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                  )}
                  Reddi Onayla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRejectMode(false)
                    setRejectReason("")
                  }}
                  className="border-[#2a3650] text-[#8892a8] text-[10px] font-mono min-h-[40px]"
                >
                  Vazgec
                </Button>
              </>
            )}

            {/* Edit confirm/cancel */}
            {editMode && (
              <>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={!editText.trim() || loading}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-black text-[10px] font-mono font-bold min-h-[40px]"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  )}
                  Duzelt & Gonder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditMode(false)
                    setEditText("")
                  }}
                  className="border-[#2a3650] text-[#8892a8] text-[10px] font-mono min-h-[40px]"
                >
                  Vazgec
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
