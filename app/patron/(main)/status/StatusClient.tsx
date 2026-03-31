"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, Users, Calendar, CreditCard, ListTodo, FileText } from "lucide-react"

const DOMAINS = [
  { url: "https://app.yisa-s.com", label: "app.yisa-s.com" },
  { url: "https://yisa-s.com", label: "yisa-s.com" },
  { url: "https://bjk-tuzla.yisa-s.com", label: "bjk-tuzla.yisa-s.com" },
]

type Counts = {
  tenants: number
  athletes: number
  attendance: number
  payments: number
  ceo_tasks: number
  celf_logs: number
}
type LastTask = { id: string; title: string; status: string; created_at: string | null }
type LastLog = { id: string; directorate_code: string; stage: string; created_at: string | null }

export default function StatusClient({
  counts: initialCounts,
  lastTasks: initialTasks,
  lastLogs: initialLogs,
}: {
  counts: Counts
  lastTasks: LastTask[]
  lastLogs: LastLog[]
}) {
  const router = useRouter()
  const [domainStatus, setDomainStatus] = useState<Record<string, "up" | "down" | "checking">>({})
  const [lastCheck, setLastCheck] = useState<Record<string, string>>({})
  const counts = initialCounts
  const lastTasks = initialTasks
  const lastLogs = initialLogs

  const ping = useCallback(async (url: string) => {
    try {
      const res = await fetch(url, { method: "HEAD", mode: "no-cors" }).catch(() => null)
      return res?.ok ?? false
    } catch {
      try {
        await fetch(url, { method: "GET", cache: "no-store" })
        return true
      } catch {
        return false
      }
    }
  }, [])

  const checkDomains = useCallback(async () => {
    for (const d of DOMAINS) {
      setDomainStatus((s) => ({ ...s, [d.url]: "checking" }))
      const up = await ping(d.url)
      setDomainStatus((s) => ({ ...s, [d.url]: up ? "up" : "down" }))
      setLastCheck((c) => ({ ...c, [d.url]: new Date().toLocaleString("tr-TR") }))
    }
  }, [ping])

  const handleRefresh = useCallback(() => {
    router.refresh()
    checkDomains()
  }, [router, checkDomains])

  const countCards = [
    { key: "tenants", label: "Tenants", count: counts.tenants, icon: Building2 },
    { key: "athletes", label: "Athletes", count: counts.athletes, icon: Users },
    { key: "attendance", label: "Attendance", count: counts.attendance, icon: Calendar },
    { key: "payments", label: "Payments", count: counts.payments, icon: CreditCard },
    { key: "ceo_tasks", label: "CEO Tasks", count: counts.ceo_tasks, icon: ListTodo },
    { key: "celf_logs", label: "CELF Logs", count: counts.celf_logs, icon: FileText },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Sistem Durumu
        </h2>
        <Button
          className="bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
          onClick={handleRefresh}
        >
          Yenile
        </Button>
      </div>

      {/* Domain sağlık */}
      <div>
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">Domain sağlığı</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {DOMAINS.map((d) => (
            <div
              key={d.url}
              className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4"
            >
              <div className="font-mono text-sm text-[#e2e8f0]">{d.label}</div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    domainStatus[d.url] === "up"
                      ? "bg-[#22c55e]"
                      : domainStatus[d.url] === "down"
                      ? "bg-[#ef4444]"
                      : "bg-[#eab308] animate-pulse"
                  }`}
                />
                <span className="text-xs text-[#8892a8]">
                  {domainStatus[d.url] === "up"
                    ? "UP"
                    : domainStatus[d.url] === "down"
                    ? "DOWN"
                    : "Kontrol ediliyor…"}
                </span>
              </div>
              {lastCheck[d.url] && (
                <div className="text-[10px] text-[#8892a8] mt-1">Son: {lastCheck[d.url]}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Supabase sayaçlar */}
      <div>
        <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">Supabase sayaçlar</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countCards.map(({ key, label, count, icon: Icon }) => (
            <div
              key={key}
              className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-[#00d4ff]" />
              </div>
              <div>
                <div className="text-xs text-[#8892a8]">{label}</div>
                <div className="text-xl font-bold text-[#e2e8f0]">{count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Son işlemler */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Son 5 görev (ceo_tasks)</h3>
          <ul className="space-y-2">
            {lastTasks.length === 0 ? (
              <li className="text-xs text-[#8892a8]">Kayıt yok</li>
            ) : (
              lastTasks.map((t) => (
                <li key={t.id} className="text-xs flex justify-between gap-2">
                  <span className="text-[#e2e8f0] truncate">{t.title || "—"}</span>
                  <span className="text-[#8892a8] shrink-0">{t.status}</span>
                  {t.created_at && (
                    <span className="text-[#8892a8] shrink-0">
                      {new Date(t.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Son 5 çıktı (celf_logs)</h3>
          <ul className="space-y-2">
            {lastLogs.length === 0 ? (
              <li className="text-xs text-[#8892a8]">Kayıt yok</li>
            ) : (
              lastLogs.map((l) => (
                <li key={l.id} className="text-xs flex justify-between gap-2">
                  <span className="text-[#e2e8f0]">{l.directorate_code}</span>
                  <span className="text-[#8892a8]">{l.stage}</span>
                  {l.created_at && (
                    <span className="text-[#8892a8] shrink-0">
                      {new Date(l.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
