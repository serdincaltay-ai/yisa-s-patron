"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Play, CheckCircle, Loader2 } from "lucide-react"

type TaskItem = {
  id: string
  directorate: string
  ai_provider: string
  task_description: string
  status?: string
  exec_status?: string
}

type CommandResult = {
  epicId: string
  tasks: TaskItem[]
}

const CARD_CLASS: Record<string, string> = {
  queued: "bg-[#6b7280]/20 border-[#6b7280]/50",
  running: "bg-[#0f3460]/30 border-[#00d4ff]/50",
  completed: "bg-[#10b981]/20 border-[#10b981]/50",
  failed: "bg-[#e94560]/20 border-[#e94560]/50",
  needs_review: "bg-[#f59e0b]/20 border-[#f59e0b]/50",
}

export default function KomutMerkeziPage() {
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)
  const [applying, setApplying] = useState<string | null>(null)

  const handleAnaliz = async () => {
    const text = command.trim()
    if (!text || loading) return
    setError(null)
    setResult(null)
    setLoading(true)
    console.log("[Komut Merkezi] Analiz Et başladı:", text.slice(0, 50))
    try {
      const res = await fetch("/api/celf/tasks/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Komut merkezi akışı: önce görev üret, sonra "Tümünü Dağıt" ile çalıştır.
        body: JSON.stringify({ command: text, auto_execute: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Analiz başarısız")
      const tasks = (data.tasks ?? []).map((t: TaskItem) => ({
        ...t,
        status: t.exec_status ?? t.status ?? "queued",
      }))
      setResult({ epicId: data.epicId, tasks })
      console.log("[Komut Merkezi] Analiz tamamlandı. epicId:", data.epicId, "tasks:", tasks.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      console.error("[Komut Merkezi] Analiz hatası:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleTumunuDagit = async () => {
    if (!result?.tasks?.length) return
    setExecuting("all")
    console.log("[Komut Merkezi] Tümünü Dağıt başladı, task sayısı:", result.tasks.length)
    for (const task of result.tasks) {
      if (task.status !== "queued") continue
      setResult((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status: "running" } : t)) }
          : null
      )
      console.log("[Komut Merkezi] Execute:", task.id, task.directorate)
      try {
        const res = await fetch(`/api/celf/tasks/execute/${task.id}`, { method: "POST" })
        const data = await res.json()
        const status = data.status ?? (res.ok ? "completed" : "failed")
        setResult((prev) =>
          prev
            ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) }
            : null
        )
        console.log("[Komut Merkezi] Execute sonuç:", task.id, status)
      } catch (e) {
        setResult((prev) =>
          prev
            ? { ...prev, tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, status: "failed" } : t)) }
            : null
        )
        console.error("[Komut Merkezi] Execute hata:", task.id, e)
      }
    }
    setExecuting(null)
    console.log("[Komut Merkezi] Tümünü Dağıt bitti")
  }

  const handleUygula = async (taskId: string) => {
    setApplying(taskId)
    console.log("[Komut Merkezi] Apply:", taskId)
    try {
      const res = await fetch(`/api/celf/tasks/apply/${taskId}`, { method: "POST" })
      const data = await res.json()
      console.log("[Komut Merkezi] Apply sonuç:", taskId, data.applied)
    } finally {
      setApplying(null)
    }
  }

  const handleTumunuUygula = async () => {
    if (!result?.tasks?.length) return
    const completed = result.tasks.filter((t) => t.status === "completed" || t.status === "needs_review")
    if (!completed.length) return
    setApplying("all")
    console.log("[Komut Merkezi] Tümünü Onayla + Uygula, completed:", completed.length)
    for (const task of completed) {
      try {
        const res = await fetch(`/api/celf/tasks/apply/${task.id}`, { method: "POST" })
        const data = await res.json()
        console.log("[Komut Merkezi] Apply:", task.id, data.applied)
      } catch (e) {
        console.error("[Komut Merkezi] Apply hata:", task.id, e)
      }
    }
    setApplying(null)
    console.log("[Komut Merkezi] Tümünü Uygula bitti")
  }

  const allDone = result?.tasks?.length
    ? result.tasks.every((t) => ["completed", "failed", "needs_review"].includes(t.status ?? ""))
    : false
  const completedCount = result?.tasks?.filter(
    (t) => t.status === "completed" || t.status === "needs_review"
  ).length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#e2e8f0]">🧠 Komut Merkezi</h1>

      <Card className="bg-[#0f3460]/20 border-[#0f3460]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[#00d4ff]">Patron komutu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Komutunuzu yazın (örn: Tüm direktörlükler için pazarlama kampanyası planla)"
            className="w-full min-h-[120px] rounded-lg bg-[#0a0a1a] border border-[#0f3460]/60 text-[#e2e8f0] placeholder:text-[#8892a8] p-3 focus:ring-2 focus:ring-[#00d4ff]/50 focus:border-[#00d4ff] outline-none"
            disabled={loading}
          />
          <Button
            onClick={handleAnaliz}
            disabled={loading || !command.trim()}
            className="bg-[#e94560] hover:bg-[#e94560]/90 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Analiz Et
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-[#e94560]/20 border border-[#e94560]/50 text-[#e94560] px-4 py-2">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#8892a8]">Epic: {result.epicId.slice(0, 8)}…</span>
            <Button
              onClick={handleTumunuDagit}
              disabled={!!executing || !result.tasks.length}
              variant="outline"
              className="border-[#00d4ff]/50 text-[#00d4ff] hover:bg-[#00d4ff]/10"
            >
              {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Tümünü Dağıt
            </Button>
            {allDone && completedCount > 0 && (
              <Button
                onClick={handleTumunuUygula}
                disabled={!!applying}
                className="bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 border border-[#10b981]/40"
              >
                {applying === "all" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Onayla + Uygula (Tümü)
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.tasks.map((task) => (
              <Card
                key={task.id}
                className={`${CARD_CLASS[task.status ?? "queued"] ?? CARD_CLASS.queued} border transition-colors`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-[#00d4ff]">{task.directorate}</span>
                    <span className="text-[#8892a8]">·</span>
                    <span className="text-[#e94560]">{task.ai_provider}</span>
                    {task.status && (
                      <span className="text-[10px] text-[#8892a8] ml-1">({task.status})</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-[#e2e8f0]/90 line-clamp-3">{task.task_description}</p>
                  <Button
                    size="sm"
                    onClick={() => handleUygula(task.id)}
                    disabled={!!applying || (task.status !== "completed" && task.status !== "needs_review")}
                    className="bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30 border border-[#00d4ff]/40"
                  >
                    {applying === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    Onayla + Uygula
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
