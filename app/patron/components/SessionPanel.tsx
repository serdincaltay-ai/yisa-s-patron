"use client"

import { useEffect, useState } from "react"

type TaskRow = {
  id: string
  directorate: string
  status: string
  output_type?: string
  output_result?: Record<string, unknown>
}

type EpicRow = {
  id: string
  patron_command: string
  status: string
  approval_status?: string
  created_at: string
  tasksFlat: TaskRow[]
}

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "approved", label: "Onaylandı" },
  { id: "rejected", label: "Reddedildi" },
  { id: "processing", label: "İşleniyor" },
]

export default function SessionPanel() {
  const [epics, setEpics] = useState<EpicRow[]>([])
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<EpicRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/celf/tasks/board")
      .then((r) => r.json())
      .then((d) => {
        setEpics(d?.epics ?? [])
      })
      .catch(() => setEpics([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = epics.filter((e) => {
    const status = e.approval_status ?? e.status
    if (filter === "all") return true
    if (filter === "approved") return status === "approved"
    if (filter === "rejected") return status === "rejected"
    if (filter === "processing")
      return ["preparing", "approval_pending", "distributed", "in_progress"].includes(status)
    return true
  })

  function formatDate(s: string) {
    if (!s) return "—"
    return new Date(s).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h2 className="text-xl font-bold text-[#e2e8f0] font-mono">SESSION</h2>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === f.id
                ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                : "text-[#8892a8] hover:bg-[#0f3460]/20 hover:text-[#e2e8f0]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#8892a8] text-sm">Yükleniyor...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelected(selected?.id === e.id ? null : e)}
              className="w-full text-left rounded-lg border border-[#0f3460]/40 bg-[#0a0e17]/80 p-3 hover:bg-[#0f3460]/20 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm text-[#e2e8f0] line-clamp-1 flex-1">
                  {e.patron_command || e.id}
                </p>
                <span className="text-xs text-[#8892a8] flex-shrink-0">
                  {formatDate(e.created_at)}
                </span>
              </div>
              <p className="text-xs text-[#8892a8] mt-1">
                {(e.approval_status ?? e.status) ?? "—"} · {(e.tasksFlat ?? []).length} görev
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-lg border border-[#0f3460]/40 bg-[#0a0e17] p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-mono text-[#00d4ff]">Detay</h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[#8892a8] hover:text-[#e2e8f0] text-sm"
            >
              Kapat
            </button>
          </div>
          <p className="text-sm text-[#e2e8f0]">{selected.patron_command}</p>
          <p className="text-xs text-[#8892a8]">
            Direktörler: {(selected.tasksFlat ?? []).map((t) => t.directorate).join(", ")}
          </p>
          <div className="text-xs font-mono text-[#e2e8f0] overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
            {selected.tasksFlat?.some((t) => t.output_result && Object.keys(t.output_result).length > 0)
              ? JSON.stringify(
                  selected.tasksFlat
                    .filter((t) => t.output_result && Object.keys(t.output_result).length > 0)
                    .map((t) => ({ directorate: t.directorate, output_result: t.output_result })),
                  null,
                  2
                )
              : "Önizleme yok"}
          </div>
        </div>
      )}
    </div>
  )
}
