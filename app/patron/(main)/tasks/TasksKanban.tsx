"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "BACKLOG", label: "BACKLOG", color: "bg-[#6b7280]" },
  { id: "READY", label: "READY", color: "bg-[#3b82f6]" },
  { id: "IN_PROGRESS", label: "IN PROGRESS", color: "bg-[#eab308]" },
  { id: "REVIEW", label: "REVIEW", color: "bg-[#f97316]" },
  { id: "DONE", label: "DONE", color: "bg-[#22c55e]" },
  { id: "BLOCKED", label: "BLOCKED", color: "bg-[#ef4444]" },
]

type Task = {
  id: string
  input: string | null
  task_type: string | null
  target_robot: string | null
  scope: string
  priority: number
  status: string
  approved_at: string | null
  approved_by: string | null
  created_at: string | null
}

type Tenant = { id: string; ad: string; slug: string; durum: string }

function parseTitle(input: string | null): string {
  if (!input) return "—"
  try {
    const o = JSON.parse(input)
    return (o?.title ?? input).slice(0, 80) || "—"
  } catch {
    return (input as string).slice(0, 80) || "—"
  }
}

function parseInput(input: string | null): { title: string; description?: string } {
  if (!input) return { title: "—" }
  try {
    const o = JSON.parse(input)
    return { title: o?.title ?? "—", description: o?.description }
  } catch {
    return { title: (input as string).slice(0, 80) || "—" }
  }
}

export default function TasksKanban({
  initialTasks,
  tenants,
}: {
  initialTasks: Task[]
  tenants: Tenant[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    scope: "global" as "global" | "tenant",
    tenant_id: "",
    priority: 3,
  })

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast({ title: "Başlık gerekli", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/ceo-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          scope: form.scope,
          tenant_id: form.scope === "tenant" && form.tenant_id ? form.tenant_id : undefined,
          priority: form.priority,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Hata", description: data?.error?.message ?? "Görev oluşturulamadı", variant: "destructive" })
        return
      }
      toast({ title: "Görev oluşturuldu", variant: "success" })
      setModalOpen(false)
      setForm({ title: "", description: "", scope: "global", tenant_id: "", priority: 3 })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId: string, status: string) => {
    setStatusUpdating(taskId)
    try {
      const res = await fetch(`/api/ceo-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Hata", description: data?.error?.message ?? "Durum güncellenemedi", variant: "destructive" })
        return
      }
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
      router.refresh()
    } finally {
      setStatusUpdating(null)
    }
  }

  const byStatus = (status: string) => tasks.filter((t) => t.status === status)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Görev Yönetimi
        </h2>
        <Button
          className="bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
          onClick={() => setModalOpen(true)}
        >
          Yeni Görev
        </Button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="w-64 flex-shrink-0 rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 flex flex-col max-h-[70vh]"
            >
              <div className={`p-2 rounded-t-xl text-center text-xs font-bold text-white ${col.color}`}>
                {col.label}
              </div>
              <div className="p-2 flex-1 overflow-y-auto space-y-2">
                {byStatus(col.id).map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a] p-3 space-y-2"
                  >
                    <Link
                      href={`/patron/tasks/${task.id}`}
                      className="block font-medium text-[#e2e8f0] hover:text-[#00d4ff] text-sm line-clamp-2"
                    >
                      {parseTitle(task.input)}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          task.scope === "global"
                            ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                            : "bg-[#22c55e]/20 text-[#22c55e]"
                        }`}
                      >
                        {task.scope === "global" ? "Global" : "Tenant"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#6b7280]/20 text-[#9ca3af]">
                        P{task.priority}
                      </span>
                    </div>
                    <Select
                      value={task.status}
                      onValueChange={(v) => handleStatusChange(task.id, v)}
                      disabled={!!statusUpdating}
                    >
                      <SelectTrigger className="h-8 text-xs bg-[#0f3460]/20 border-[#0f3460]/40 text-[#e2e8f0]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#0a0a1a] border-[#0f3460]/40 text-[#e2e8f0] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#e2e8f0]">
              Yeni Görev
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-[#8892a8] block mb-1">Başlık</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-md border border-[#0f3460]/40 bg-[#0a0a1a] px-3 py-2 text-sm text-[#e2e8f0]"
                placeholder="Görev başlığı"
              />
            </div>
            <div>
              <label className="text-xs text-[#8892a8] block mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-md border border-[#0f3460]/40 bg-[#0a0a1a] px-3 py-2 text-sm text-[#e2e8f0] min-h-[80px]"
                placeholder="İsteğe bağlı"
              />
            </div>
            <div>
              <label className="text-xs text-[#8892a8] block mb-1">Kapsam</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={form.scope === "global"}
                    onChange={() => setForm((f) => ({ ...f, scope: "global" }))}
                    className="text-[#00d4ff]"
                  />
                  <span className="text-sm">Global</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="scope"
                    checked={form.scope === "tenant"}
                    onChange={() => setForm((f) => ({ ...f, scope: "tenant" }))}
                    className="text-[#00d4ff]"
                  />
                  <span className="text-sm">Tenant</span>
                </label>
              </div>
            </div>
            {form.scope === "tenant" && (
              <div>
                <label className="text-xs text-[#8892a8] block mb-1">Tenant</label>
                <select
                  value={form.tenant_id}
                  onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))}
                  className="w-full rounded-md border border-[#0f3460]/40 bg-[#0a0a1a] px-3 py-2 text-sm text-[#e2e8f0]"
                >
                  <option value="">Seçin</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.ad}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-[#8892a8] block mb-1">Öncelik (1-5)</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full rounded-md border border-[#0f3460]/40 bg-[#0a0a1a] px-3 py-2 text-sm text-[#e2e8f0]"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-[#0f3460]/40 text-[#8892a8]">
              İptal
            </Button>
            <Button
              className="bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
