"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DIREKTORLUKLER, slugToCode } from "@/lib/direktorlukler/config"

type Epic = { id: string; patron_command: string; status: string; total_tasks: number; completed_tasks: number; created_at: string }
type Task = { id: string; epic_id: string; directorate: string; status: string; task_description: string; created_at: string }

export default function CelfPanelPage() {
  const [epics, setEpics] = useState<Epic[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState({ directorate: "teknik", description: "" })
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/celf/epics").then((r) => r.json()),
      fetch("/api/celf/board").then((r) => r.json()),
    ])
      .then(([epicsRes, boardRes]) => {
        if (Array.isArray(epicsRes)) setEpics(epicsRes)
        else if (epicsRes?.data) setEpics(epicsRes.data)
        const taskList = Array.isArray(boardRes) ? boardRes : boardRes?.tasks || []
        setTasks(taskList)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreateTask = async () => {
    if (!newTask.description.trim()) return
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch("/api/celf/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directorate: newTask.directorate, task_description: newTask.description }),
      })
      const data = await res.json()
      if (data?.id || data?.ok) {
        setMessage("Gorev olusturuldu!")
        setNewTask((f) => ({ ...f, description: "" }))
        setTasks((prev) => [{ id: data.id || "new", epic_id: "", directorate: slugToCode(newTask.directorate) ?? newTask.directorate, status: "queued", task_description: newTask.description, created_at: new Date().toISOString() }, ...prev])
      } else {
        setMessage("Hata: " + (data?.error || "Bilinmeyen"))
      }
    } catch {
      setMessage("Baglanti hatasi")
    } finally {
      setCreating(false)
    }
  }

  const tasksByDir: Record<string, number> = {}
  tasks.forEach((t) => { tasksByDir[t.directorate] = (tasksByDir[t.directorate] || 0) + 1 })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">CELF Organizasyon Paneli</h2>
        <p className="text-sm text-[#8892a8] mt-1">12 direktorluk gorev dagitimi ve durum takibi.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {DIREKTORLUKLER.map((d) => (
          <Card key={d.slug} className="border-[#2a3650] bg-[#0a0e17]/90 hover:border-[#00d4ff]/40 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: d.neonColor + "20", color: d.neonColor }}>
                  <d.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-[#e2e8f0]">{d.shortName}</span>
              </div>
              <p className="text-xs text-[#8892a8] line-clamp-2">{d.description}</p>
              <p className="text-xs mt-2" style={{ color: d.neonColor }}>{tasksByDir[d.code] || 0} gorev</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#2a3650] bg-[#0a0e17]/90">
        <CardHeader><CardTitle className="text-[#e2e8f0]">Yeni Gorev Olustur</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <select
              value={newTask.directorate}
              onChange={(e) => setNewTask((f) => ({ ...f, directorate: e.target.value }))}
              className="rounded-md border border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] px-3 py-2 text-sm min-w-[150px]"
            >
              {DIREKTORLUKLER.map((d) => (
                <option key={d.slug} value={d.slug}>{d.shortName}</option>
              ))}
            </select>
            <Input placeholder="Gorev aciklamasi..." value={newTask.description} onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))} className="flex-1 min-w-[200px] border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
            <Button onClick={handleCreateTask} disabled={creating} className="bg-[#e94560] hover:bg-[#d13a52] text-white font-medium">
              {creating ? "Olusturuluyor..." : "Gorev Olustur"}
            </Button>
          </div>
          {message && <p className="text-sm mt-2 text-[#00d4ff]">{message}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[#2a3650] bg-[#0a0e17]/90">
          <CardHeader><CardTitle className="text-[#e2e8f0]">Epikler</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-[#8892a8]">Yukleniyor...</p> : epics.length === 0 ? <p className="text-sm text-[#8892a8]">Henuz epik yok.</p> : (
              <ul className="space-y-2">
                {epics.slice(0, 10).map((e) => (
                  <li key={e.id} className="text-sm border-b border-[#2a3650]/60 pb-2">
                    <span className="text-[#cbd5e1]">{e.patron_command?.slice(0, 50)}...</span>
                    <span className="ml-2 text-[#818cf8]">{e.status}</span>
                    <span className="ml-2 text-[#8892a8]">{e.completed_tasks}/{e.total_tasks}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-[#2a3650] bg-[#0a0e17]/90">
          <CardHeader><CardTitle className="text-[#e2e8f0]">Son Görevler</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-[#8892a8]">Yukleniyor...</p> : tasks.length === 0 ? <p className="text-sm text-[#8892a8]">Henuz gorev yok.</p> : (
              <ul className="space-y-2">
                {tasks.slice(0, 10).map((t) => (
                  <li key={t.id} className="text-sm border-b border-[#2a3650]/60 pb-2">
                    <span className="text-[#818cf8]">{t.directorate}</span>
                    <span className="mx-2 text-[#8892a8]">\u2014</span>
                    <span className="text-[#cbd5e1]">{(t.task_description || "").slice(0, 40)}{(t.task_description?.length ?? 0) > 40 ? "..." : ""}</span>
                    <span className="ml-2 text-[#f59e0b]">{t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Link href="/patron/komut-merkezi">
          <Button variant="outline" className="border-[#2a3650] text-[#e2e8f0]">Komut merkezine git</Button>
        </Link>
      </div>
    </div>
  )
}
