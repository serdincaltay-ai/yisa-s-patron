"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock, Users, CheckCircle2, XCircle, RefreshCw } from "lucide-react"

interface SessionItem {
  id: string
  tenant_name: string
  branch: string
  coach_name: string
  start_time: string
  end_time: string | null
  athlete_count: number
  status: "active" | "completed" | "cancelled"
}

export default function SessionList() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data.items) ? data.items : [])
      }
    } catch {
      // API henüz mevcut olmayabilir
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filtered = sessions.filter((s) => {
    if (filter === "all") return true
    return s.status === filter
  })

  const statusBadge = (status: SessionItem["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Aktif
          </span>
        )
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
            <CheckCircle2 className="h-3 w-3" />
            Tamamlandı
          </span>
        )
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            <XCircle className="h-3 w-3" />
            İptal
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "active", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                : "text-[#8892a8] hover:text-[#e2e8f0] hover:bg-white/5"
            }`}
          >
            {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Tamamlanan"}
          </button>
        ))}
        <button
          onClick={fetchSessions}
          className="ml-auto rounded-lg p-1.5 text-[#8892a8] hover:text-[#e2e8f0] hover:bg-white/5 transition-colors"
          title="Yenile"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Session list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00d4ff] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-[#8892a8]/50 mb-2" />
          <p className="text-sm text-[#8892a8]">Henüz oturum kaydı yok.</p>
          <p className="text-xs text-[#8892a8]/60 mt-1">
            Tesis antrenörleri ders başlattığında burada görünecek.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 transition-all hover:border-[#0f3460]/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-[#e2e8f0] truncate">
                      {session.tenant_name}
                    </h3>
                    {statusBadge(session.status)}
                  </div>
                  <p className="text-xs text-[#8892a8]">
                    {session.branch} — {session.coach_name}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#8892a8] shrink-0">
                  <Users className="h-3.5 w-3.5" />
                  {session.athlete_count}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-[#8892a8]/80">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(session.start_time).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {session.end_time && (
                  <span>
                    → {new Date(session.end_time).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
