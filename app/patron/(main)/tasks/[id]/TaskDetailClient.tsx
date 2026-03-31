"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const STATUS_OPTIONS = ["BACKLOG", "READY", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]
const STAGE_COLORS: Record<string, string> = {
  parsed: "bg-[#eab308]/20 text-[#eab308]",
  executed: "bg-[#3b82f6]/20 text-[#3b82f6]",
  approved: "bg-[#22c55e]/20 text-[#22c55e]",
}
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[#6b7280]/20 text-[#9ca3af]",
  done: "bg-[#22c55e]/20 text-[#22c55e]",
  failed: "bg-[#ef4444]/20 text-[#ef4444]",
}

function parseInput(input: string | null): { title: string; description?: string } {
  if (!input) return { title: "—" }
  try {
    const o = JSON.parse(input)
    return { title: o?.title ?? "—", description: o?.description }
  } catch {
    return { title: (input as string).slice(0, 200) || "—" }
  }
}

type Task = {
  id: string
  input: string | null
  scope: string
  priority: number
  status: string
  approved_at: string | null
  created_at: string | null
}
type Log = {
  id: string
  directorate_code: string
  stage: string
  ai_provider: string | null
  content: unknown
  status: string
  created_at: string | null
}

export default function TaskDetailClient({
  task,
  logs,
  dirMap,
  directorateCodes = [],
}: {
  task: Task
  logs: Log[]
  dirMap: Record<string, string>
  directorateCodes?: string[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(task.status)
  const [loading, setLoading] = useState<string | null>(null)
  const { title, description } = parseInput(task.input)

  const updateStatus = async (newStatus: string) => {
    setLoading("status")
    try {
      const res = await fetch(`/api/ceo-tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast({ title: "Hata", description: d?.error?.message ?? "Güncellenemedi", variant: "destructive" })
        return
      }
      setStatus(newStatus)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const callApi = async (action: "parse" | "execute" | "approve", decision?: "approve" | "reject") => {
    setLoading(action)
    try {
      const url = action === "approve"
        ? "/api/celf/tasks/approve"
        : action === "parse"
        ? "/api/celf/tasks/command"
        : "/api/celf/legacy-execute"
      const body =
        action === "approve"
          ? { task_id: task.id, approved: decision === "approve" }
          : action === "parse"
          ? { command: [title, description].filter(Boolean).join("\n").trim() || title || "Görev", confirmed: true }
          : { task_id: task.id }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Hata", description: typeof data?.error === "string" ? data.error : data?.error?.message ?? "İşlem başarısız", variant: "destructive" })
        return
      }
      const count = action === "parse" && data?.tasks?.length != null ? data.tasks.length : null
      toast({
        title: "Başarılı",
        description:
          action === "parse"
            ? count != null
              ? `${count} direktörlük oluşturuldu`
              : "Komut işlendi"
            : action === "execute"
            ? "Çalıştırıldı"
            : decision === "reject"
            ? "Reddedildi"
            : "Onaylandı",
        variant: "success",
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  const codes = directorateCodes.length ? directorateCodes : [...new Set(logs.map((l) => l.directorate_code))]
  const logsByCode: Record<string, Log> = {}
  logs.forEach((l) => { logsByCode[l.directorate_code] = l })

  return (
    <div className="space-y-8">
      {/* Görev bilgisi */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 md:p-6 space-y-3">
        <h1 className="text-xl font-bold text-[#e2e8f0]">{title}</h1>
        {description && <p className="text-sm text-[#8892a8] whitespace-pre-wrap">{description}</p>}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs px-2 py-0.5 rounded bg-[#6b7280]/20 text-[#9ca3af]">
            {status}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#3b82f6]/20 text-[#3b82f6]">
            {task.scope === "global" ? "Global" : "Tenant"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#0f3460]/40 text-[#8892a8]">
            Öncelik {task.priority}
          </span>
          {task.created_at && (
            <span className="text-xs text-[#8892a8]">
              {new Date(task.created_at).toLocaleString("tr-TR")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-[#8892a8]">Durum:</span>
          <Select value={status} onValueChange={updateStatus} disabled={!!loading}>
            <SelectTrigger className="w-40 h-8 text-xs bg-[#0f3460]/20 border-[#0f3460]/40 text-[#e2e8f0]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Aksiyon butonları */}
      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/40 hover:bg-[#eab308]/30"
          onClick={() => callApi("parse")}
          disabled={!!loading}
        >
          {loading === "parse" ? "İşleniyor…" : "Parse Et"}
        </Button>
        <Button
          className="bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/40 hover:bg-[#3b82f6]/30"
          onClick={() => callApi("execute")}
          disabled={!!loading}
        >
          {loading === "execute" ? "İşleniyor…" : "Çalıştır"}
        </Button>
        <Button
          className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#22c55e]/30"
          onClick={() => callApi("approve", "approve")}
          disabled={!!loading}
        >
          {loading === "approve" ? "…" : "Onayla"}
        </Button>
        <Button
          variant="outline"
          className="border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10"
          onClick={() => callApi("approve", "reject")}
          disabled={!!loading}
        >
          Reddet
        </Button>
      </div>

      {/* 12 Direktörlük çıktıları */}
      <div>
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4">Direktörlük çıktıları</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {codes.map((code) => {
            const log = logsByCode[code]
            const name = dirMap[code] ?? code
            if (!log) {
              return (
                <div
                  key={code}
                  className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/60 p-4"
                >
                  <div className="font-medium text-[#e2e8f0]">{name}</div>
                  <div className="text-xs text-[#8892a8] mt-1">Henüz çıktı yok</div>
                </div>
              )
            }
            const stageClass = STAGE_COLORS[log.stage] ?? "bg-[#6b7280]/20 text-[#9ca3af]"
            const statusClass = STATUS_COLORS[log.status] ?? "bg-[#6b7280]/20 text-[#9ca3af]"
            const contentStr =
              typeof log.content === "string"
                ? log.content
                : log.content != null
                ? JSON.stringify(log.content, null, 2)
                : ""
            return (
              <div
                key={log.id}
                className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4"
              >
                <div className="font-medium text-[#e2e8f0]">{name}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${stageClass}`}>
                    {log.stage}
                  </span>
                  {log.ai_provider && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f3460]/40 text-[#8892a8]">
                      {log.ai_provider}
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusClass}`}>
                    {log.status}
                  </span>
                </div>
                {contentStr && (
                  <pre className="mt-2 text-[10px] text-[#8892a8] overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded bg-[#0f3460]/20 p-2">
                    {contentStr}
                  </pre>
                )}
                {log.created_at && (
                  <div className="text-[10px] text-[#8892a8] mt-1">
                    {new Date(log.created_at).toLocaleString("tr-TR")}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
