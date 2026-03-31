"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  Users,
  RefreshCw,
  ChevronDown,
} from "lucide-react"

type TalepType = "franchise" | "veli" | "personel" | "diger"
type TalepStatus = "beklemede" | "onaylandi" | "reddedildi"

interface TalepItem {
  id: string
  type: TalepType
  requester_name: string
  subject: string
  detail: string | null
  status: TalepStatus
  created_at: string
  tenant_name: string | null
}

const TYPE_LABELS: Record<TalepType, { label: string; icon: React.ElementType; color: string }> = {
  franchise: { label: "Franchise", icon: Building2, color: "#00d4ff" },
  veli: { label: "Veli", icon: User, color: "#10b981" },
  personel: { label: "Personel", icon: Users, color: "#f59e0b" },
  diger: { label: "Diğer", icon: Inbox, color: "#8892a8" },
}

export default function TaleplerList() {
  const [talepler, setTalepler] = useState<TalepItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TalepType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<TalepStatus | "all">("all")

  const fetchTalepler = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/talepler")
      if (res.ok) {
        const data = await res.json()
        setTalepler(Array.isArray(data.items) ? data.items : [])
      }
    } catch {
      // API henüz mevcut olmayabilir
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTalepler()
  }, [fetchTalepler])

  const filtered = talepler.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    return true
  })

  const statusBadge = (status: TalepStatus) => {
    switch (status) {
      case "beklemede":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Beklemede
          </span>
        )
      case "onaylandi":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Onaylandı
          </span>
        )
      case "reddedildi":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            <XCircle className="h-3 w-3" />
            Reddedildi
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-1">
          {(["all", "franchise", "veli", "personel", "diger"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                  : "text-[#8892a8] hover:text-[#e2e8f0]"
              }`}
            >
              {t === "all" ? "Tümü" : TYPE_LABELS[t].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-1">
          {(["all", "beklemede", "onaylandi", "reddedildi"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                  : "text-[#8892a8] hover:text-[#e2e8f0]"
              }`}
            >
              {s === "all" ? "Tümü" : s === "beklemede" ? "Beklemede" : s === "onaylandi" ? "Onaylı" : "Reddedildi"}
            </button>
          ))}
        </div>
        <button
          onClick={fetchTalepler}
          className="ml-auto rounded-lg p-1.5 text-[#8892a8] hover:text-[#e2e8f0] hover:bg-white/5 transition-colors"
          title="Yenile"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-3">
          <p className="text-xs text-[#8892a8]">Toplam</p>
          <p className="text-lg font-bold text-[#e2e8f0]">{talepler.length}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-400">Beklemede</p>
          <p className="text-lg font-bold text-amber-400">
            {talepler.filter((t) => t.status === "beklemede").length}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-400">Onaylı</p>
          <p className="text-lg font-bold text-emerald-400">
            {talepler.filter((t) => t.status === "onaylandi").length}
          </p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">Reddedildi</p>
          <p className="text-lg font-bold text-red-400">
            {talepler.filter((t) => t.status === "reddedildi").length}
          </p>
        </div>
      </div>

      {/* Talep list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00d4ff] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-[#8892a8]/50 mb-2" />
          <p className="text-sm text-[#8892a8]">Henüz talep yok.</p>
          <p className="text-xs text-[#8892a8]/60 mt-1">
            Franchise veya veli taleplerini buradan takip edebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((talep) => {
            const typeInfo = TYPE_LABELS[talep.type]
            const TypeIcon = typeInfo.icon
            return (
              <div
                key={talep.id}
                className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 transition-all hover:border-[#0f3460]/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                    >
                      <TypeIcon className="h-4.5 w-4.5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-medium text-[#e2e8f0] truncate">
                          {talep.subject}
                        </h3>
                        {statusBadge(talep.status)}
                      </div>
                      <p className="text-xs text-[#8892a8]">
                        {talep.requester_name}
                        {talep.tenant_name && (
                          <span className="text-[#8892a8]/60"> · {talep.tenant_name}</span>
                        )}
                      </p>
                      {talep.detail && (
                        <p className="text-xs text-[#8892a8]/70 mt-1 line-clamp-2">
                          {talep.detail}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8892a8]/60 shrink-0">
                    {new Date(talep.created_at).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
