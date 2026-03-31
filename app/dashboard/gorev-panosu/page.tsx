"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, XCircle, FileText } from "lucide-react"

const DIRECTORY_COLUMNS = ["CTO", "CFO", "CMO", "CSPO", "CPO", "CDO", "CHRO", "CLO", "CSO", "CISO", "CCO", "CRDO"]

type Task = {
  id: string
  epic_id: string
  directorate: string
  ai_provider: string
  task_description: string
  status: string
  output_type?: string
  output_result?: Record<string, unknown>
  apply_status?: string
  completed_at?: string | null
}

type EpicWithTasks = {
  id: string
  patron_command?: string
  raw_command?: string
  status: string
  parsed_directorates: string[]
  total_tasks: number
  completed_tasks: number
  created_at: string
  tasks: Record<string, Task[]>
  tasksFlat: Task[]
}

type BoardData = {
  epics: EpicWithTasks[]
  directorates: string[]
  stats: { total: number; completed: number; running: number; failed: number }
}

export default function GorevPanosuPage() {
  const [data, setData] = useState<BoardData | null>(null)
  const [epicFilter, setEpicFilter] = useState<string>("")
  const [modalTask, setModalTask] = useState<Task | null>(null)
  const [applying, setApplying] = useState<string | null>(null)

  const fetchBoard = () => {
    const url = epicFilter ? `/api/celf/tasks/board?epicId=${encodeURIComponent(epicFilter)}` : "/api/celf/tasks/board"
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.epics) setData(d)
      })
      .catch(() => setData(null))
  }

  useEffect(() => {
    fetchBoard()
    const t = setInterval(fetchBoard, 5000)
    return () => clearInterval(t)
  }, [epicFilter])

  const handleUygula = async (taskId: string) => {
    setApplying(taskId)
    try {
      await fetch(`/api/celf/tasks/apply/${taskId}`, { method: "POST" })
      fetchBoard()
      setModalTask(null)
    } finally {
      setApplying(null)
    }
  }

  const epics = data?.epics ?? []
  const stats = data?.stats ?? { total: 0, completed: 0, running: 0, failed: 0 }
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#e2e8f0]">📋 Görev Panosu</h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#8892a8]">Epic:</span>
          <Select value={epicFilter || "all"} onValueChange={(v) => setEpicFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[220px] bg-[#0f3460]/20 border-[#0f3460]/50 text-[#e2e8f0]">
              <SelectValue placeholder="Tümü" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {epics.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {(e.patron_command || e.raw_command || "")?.slice(0, 40)}… ({e.completed_tasks}/{e.total_tasks})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-xs text-[#8892a8] mb-1">
            <span>İlerleme</span>
            <span>{stats.completed} / {stats.total} tamamlandı</span>
          </div>
          <div className="h-2 rounded-full bg-[#0f3460]/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#00d4ff] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {DIRECTORY_COLUMNS.map((dir) => {
            const tasksInDir: Task[] = []
            epics.forEach((epic) => {
              const list = epic.tasks?.[dir] ?? []
              tasksInDir.push(...list)
            })
            return (
              <div
                key={dir}
                className="w-[280px] flex-shrink-0 rounded-lg bg-[#0f3460]/15 border border-[#0f3460]/40 p-2"
              >
                <h3 className="text-sm font-semibold text-[#00d4ff] mb-2 sticky top-0 bg-[#0f3460]/30 rounded px-2 py-1">
                  {dir}
                </h3>
                <div className="space-y-2">
                  {tasksInDir.map((task) => (
                    <Card
                      key={task.id}
                      className="bg-[#0a0a1a]/80 border-[#0f3460]/30 cursor-pointer hover:border-[#00d4ff]/40 transition-colors"
                      onClick={() => setModalTask(task)}
                    >
                      <CardContent className="p-2">
                        <p className="text-xs text-[#e2e8f0]/90 line-clamp-2">{task.task_description}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-[#e94560]">{task.ai_provider}</span>
                          <span className="text-[10px] text-[#8892a8]">· {task.status}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasksInDir.length === 0 && (
                    <p className="text-xs text-[#8892a8] italic py-2">Görev yok</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalTask(null)}
        >
          <Card
            className="w-full max-w-lg bg-[#0a0a1a] border-[#0f3460] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#00d4ff] flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {modalTask.directorate} · {modalTask.ai_provider}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setModalTask(null)} className="text-[#8892a8]">
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[#e2e8f0]">{modalTask.task_description}</p>
              {modalTask.output_result && Object.keys(modalTask.output_result).length > 0 && (
                <pre className="text-xs bg-[#0f3460]/30 rounded p-2 text-[#e2e8f0]/90 overflow-auto max-h-40">
                  {JSON.stringify(modalTask.output_result, null, 2)}
                </pre>
              )}
              <p className="text-xs text-[#8892a8]">Durum: {modalTask.status} · Çıktı: {modalTask.output_type ?? "—"}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleUygula(modalTask.id)}
                  disabled={!!applying}
                  className="bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Uygula
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalTask(null)}
                  className="border-[#e94560]/50 text-[#e94560] hover:bg-[#e94560]/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reddet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
