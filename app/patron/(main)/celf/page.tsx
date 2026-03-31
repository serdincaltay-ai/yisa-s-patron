"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DIREKTORLUKLER, slugToCode } from "@/lib/direktorlukler/config"
import {
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Eye,
  RotateCcw,
  ListChecks,
} from "lucide-react"

type Epic = {
  id: string
  title?: string
  patron_command?: string
  raw_command?: string
  status: string
  total_tasks?: number
  completed_tasks?: number
  task_count?: number
  created_at: string
}

type Task = {
  id: string
  epic_id: string
  directorate: string
  title?: string
  status: string
  task_description: string
  ai_provider?: string
  created_at: string
  epic?: { id: string; title: string; raw_command: string }
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#8892a8",
  queued: "#f59e0b",
  in_progress: "#00d4ff",
  pending_review: "#a855f7",
  approved: "#22c55e",
  completed: "#22c55e",
  rejected: "#ef4444",
  failed: "#ef4444",
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#8892a8"
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "20", color }}>
      {status}
    </span>
  )
}

export default function CelfPanelPage() {
  const [epics, setEpics] = useState<Epic[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [commandText, setCommandText] = useState("")
  const [commandScope, setCommandScope] = useState("company")
  const [submitting, setSubmitting] = useState(false)
  const [previewEpic, setPreviewEpic] = useState<{ id: string; title: string } | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [taskFilter, setTaskFilter] = useState<string>("all")

  const fetchData = useCallback(async () => {
    try {
      const [epicsRes, boardRes] = await Promise.all([
        fetch("/api/celf/epics").then((r) => r.json()),
        fetch("/api/celf/board").then((r) => r.json()),
      ])
      if (Array.isArray(epicsRes)) setEpics(epicsRes)
      else if (epicsRes?.data) setEpics(epicsRes.data)
      const taskList = Array.isArray(boardRes) ? boardRes : boardRes?.tasks || []
      setTasks(taskList)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // CELF command flow: komut → epic oluştur → preview
  const handleSubmitCommand = async () => {
    const cmd = commandText.trim()
    if (!cmd) return
    setSubmitting(true)
    setMessage(null)
    setPreviewEpic(null)
    try {
      const res = await fetch("/api/celf/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_command: cmd, scope: commandScope }),
      })
      const data = await res.json()
      if (data?.epic_id) {
        setPreviewEpic({ id: data.epic_id, title: data.title })
        setMessage({ type: "success", text: `Epic olusturuldu: "${data.title}"` })
        setCommandText("")
        await fetchData()
      } else {
        setMessage({ type: "error", text: data?.error || "Komut islenemedi" })
      }
    } catch {
      setMessage({ type: "error", text: "Baglanti hatasi" })
    } finally {
      setSubmitting(false)
    }
  }

  // Approve/reject epic
  const handleEpicAction = async (epicId: string, action: "approve" | "reject") => {
    try {
      const endpoint = action === "approve" ? "/api/celf/tasks/approve" : "/api/celf/tasks/reject"
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epic_id: epicId }),
      })
      setMessage({ type: "success", text: action === "approve" ? "Epic onaylandi" : "Epic reddedildi" })
      setPreviewEpic(null)
      await fetchData()
    } catch {
      setMessage({ type: "error", text: "Islem basarisiz" })
    }
  }

  // Quick task creation
  const handleQuickTask = async (dirSlug: string) => {
    const desc = prompt(`${dirSlug} icin gorev aciklamasi:`)
    if (!desc?.trim()) return
    try {
      const res = await fetch("/api/celf/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directorate: dirSlug, task_description: desc }),
      })
      const data = await res.json()
      if (data?.id || data?.ok) {
        setMessage({ type: "success", text: "Gorev olusturuldu!" })
        await fetchData()
      }
    } catch {
      setMessage({ type: "error", text: "Gorev olusturulamadi" })
    }
  }

  const tasksByDir: Record<string, number> = {}
  tasks.forEach((t) => { tasksByDir[t.directorate] = (tasksByDir[t.directorate] || 0) + 1 })

  const filteredTasks = taskFilter === "all" ? tasks : tasks.filter((t) => t.status === taskFilter)

  const stats = {
    total: tasks.length,
    queued: tasks.filter((t) => t.status === "queued").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed" || t.status === "approved").length,
    pending: tasks.filter((t) => t.status === "pending_review").length,
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight flex items-center gap-2">
          <Terminal className="w-6 h-6 text-[#00d4ff]" />
          CELF Motor — Komut Merkezi
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">Komut gir, AI isle, onizle, onayla. 12 direktorluk gorev dagitimi.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Toplam", value: stats.total, icon: ListChecks, color: "#00d4ff" },
          { label: "Kuyrukta", value: stats.queued, icon: Clock, color: "#f59e0b" },
          { label: "Devam Eden", value: stats.inProgress, icon: Zap, color: "#a855f7" },
          { label: "Onay Bekleyen", value: stats.pending, icon: Eye, color: "#f97316" },
          { label: "Tamamlanan", value: stats.completed, icon: CheckCircle2, color: "#22c55e" },
        ].map((s) => (
          <Card key={s.label} className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <div>
                <p className="text-lg font-bold text-[#e2e8f0]">{s.value}</p>
                <p className="text-[10px] text-[#8892a8]">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Command Input — CELF Motor */}
      <Card className="border-[#00d4ff]/30 bg-[#0a0e17]/90">
        <CardHeader>
          <CardTitle className="text-[#00d4ff] text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Patron Komutu Gir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Ornek: Tum tenantlara yeni ders programi sablonu gonder ve 2 hafta icinde kurulumu tamamla..."
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            className="border-[#2a3650] bg-[#060810] text-[#e2e8f0] min-h-[80px] font-mono text-sm"
            rows={3}
          />
          <div className="flex items-center gap-3">
            <select
              value={commandScope}
              onChange={(e) => setCommandScope(e.target.value)}
              className="rounded-md border border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] px-3 py-2 text-sm"
            >
              <option value="company">Sirket Geneli</option>
              <option value="tenant">Tek Tenant</option>
              <option value="directorate">Tek Direktorluk</option>
            </select>
            <Button
              onClick={handleSubmitCommand}
              disabled={submitting || !commandText.trim()}
              className="bg-[#e94560] hover:bg-[#d13a52] text-white font-medium"
            >
              {submitting ? (
                <><RotateCcw className="w-4 h-4 mr-1 animate-spin" /> Isleniyor...</>
              ) : (
                <><Play className="w-4 h-4 mr-1" /> Komutu Calistir</>
              )}
            </Button>
          </div>

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
              {message.text}
            </p>
          )}

          {/* Preview Panel */}
          {previewEpic && (
            <div className="mt-3 border border-[#a855f7]/40 rounded-lg p-4 bg-[#a855f7]/5">
              <h4 className="text-sm font-medium text-[#a855f7] mb-2">Onizleme — Epic Olusturuldu</h4>
              <p className="text-sm text-[#e2e8f0] mb-3">
                <span className="text-[#8892a8]">Baslik:</span> {previewEpic.title}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEpicAction(previewEpic.id, "approve")} className="bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#22c55e]/30">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Onayla
                </Button>
                <Button size="sm" onClick={() => handleEpicAction(previewEpic.id, "reject")} className="bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#ef4444]/30">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reddet
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewEpic(null)} className="border-[#2a3650] text-[#8892a8]">
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Directorates Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {DIREKTORLUKLER.map((d) => (
          <Card
            key={d.slug}
            className="border-[#2a3650] bg-[#0a0e17]/90 hover:border-[#00d4ff]/40 transition-colors cursor-pointer"
            onClick={() => handleQuickTask(d.slug)}
          >
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

      {/* Tabs: Epics & Tasks */}
      <Tabs defaultValue="gorevler" className="w-full">
        <TabsList className="bg-[#0f3460]/20 border border-[#0f3460]/40">
          <TabsTrigger value="gorevler" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">Gorevler ({tasks.length})</TabsTrigger>
          <TabsTrigger value="epikler" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">Epikler ({epics.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="gorevler" className="mt-4">
          <Card className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-[#e2e8f0] text-sm">Gorev Tablosu</CardTitle>
                <div className="flex gap-1">
                  {["all", "queued", "in_progress", "pending_review", "completed"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                        taskFilter === f
                          ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                          : "text-[#8892a8] hover:text-[#e2e8f0]"
                      }`}
                    >
                      {f === "all" ? "Tumu" : f === "queued" ? "Kuyruk" : f === "in_progress" ? "Devam" : f === "pending_review" ? "Onay" : "Bitti"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-[#8892a8]">Yukleniyor...</p>
              ) : filteredTasks.length === 0 ? (
                <p className="text-sm text-[#8892a8]">Gorev bulunamadi.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a3650]">
                      <TableHead className="text-[#8892a8]">Dir.</TableHead>
                      <TableHead className="text-[#8892a8]">Aciklama</TableHead>
                      <TableHead className="text-[#8892a8]">Provider</TableHead>
                      <TableHead className="text-[#8892a8]">Durum</TableHead>
                      <TableHead className="text-[#8892a8]">Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.slice(0, 20).map((t) => {
                      const dir = DIREKTORLUKLER.find((d) => d.code === t.directorate)
                      return (
                        <TableRow key={t.id} className="border-[#2a3650]/60">
                          <TableCell>
                            <span className="text-xs font-medium" style={{ color: dir?.neonColor ?? "#8892a8" }}>
                              {dir?.shortName ?? t.directorate}
                            </span>
                          </TableCell>
                          <TableCell className="text-[#e2e8f0] text-sm max-w-[300px] truncate">
                            {t.task_description || t.title || "—"}
                          </TableCell>
                          <TableCell className="text-[#8892a8] text-xs">{t.ai_provider || "—"}</TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell className="text-[#8892a8] text-xs font-mono">
                            {new Date(t.created_at).toLocaleDateString("tr-TR")}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="epikler" className="mt-4">
          <Card className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardHeader>
              <CardTitle className="text-[#e2e8f0] text-sm">Epic Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-[#8892a8]">Yukleniyor...</p>
              ) : epics.length === 0 ? (
                <p className="text-sm text-[#8892a8]">Henuz epic yok.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a3650]">
                      <TableHead className="text-[#8892a8]">Baslik</TableHead>
                      <TableHead className="text-[#8892a8]">Komut</TableHead>
                      <TableHead className="text-[#8892a8]">Durum</TableHead>
                      <TableHead className="text-[#8892a8]">Gorev</TableHead>
                      <TableHead className="text-[#8892a8]">Tarih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {epics.slice(0, 15).map((e) => (
                      <TableRow key={e.id} className="border-[#2a3650]/60">
                        <TableCell className="text-[#e2e8f0] text-sm max-w-[200px] truncate">
                          {e.title || e.patron_command?.slice(0, 40) || "—"}
                        </TableCell>
                        <TableCell className="text-[#8892a8] text-xs max-w-[200px] truncate">
                          {e.raw_command || e.patron_command || "—"}
                        </TableCell>
                        <TableCell><StatusBadge status={e.status} /></TableCell>
                        <TableCell className="text-[#8892a8] text-xs font-mono">
                          {e.task_count ?? ((e.completed_tasks ?? 0) + "/" + (e.total_tasks ?? 0))}
                        </TableCell>
                        <TableCell className="text-[#8892a8] text-xs font-mono">
                          {new Date(e.created_at).toLocaleDateString("tr-TR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div>
        <Link href="/patron/komut-merkezi">
          <Button variant="outline" className="border-[#2a3650] text-[#e2e8f0]">Komut merkezine git</Button>
        </Link>
      </div>
    </div>
  )
}
