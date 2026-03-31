"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Terminal, LayoutGrid, ClipboardCheck, Wallet, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import AskScreen from "@/components/celf/AskScreen"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DIRECTORY_COLUMNS = ["CTO", "CFO", "CMO", "CPO", "CLO", "CISO", "CDO", "CSPO", "CSO", "CHRO", "CCO", "CRDO"]
const TARGET_COLORS: Record<string, string> = {
  website: "#3b82f6",
  template_pool: "#8b5cf6",
  franchise_app: "#10b981",
  central_finance: "#f59e0b",
  patron_internal: "#6b7280",
}
const STATUS_COLORS: Record<string, string> = {
  queued: "#6b7280",
  locked: "#f59e0b",
  review: "#8b5cf6",
  approved: "#10b981",
  rejected: "#ef4444",
}

export default function KomutMerkeziPage() {
  const [rawCommand, setRawCommand] = useState("")
  const [lastEpicId, setLastEpicId] = useState<string | null>(null)
  const [lastBrainEpicId, setLastBrainEpicId] = useState<string | null>(null)
  const [brainTeamResult, setBrainTeamResult] = useState<{ directorates?: string[]; tasks_created?: number } | null>(null)
  const [activeTab, setActiveTab] = useState<"ask" | "komut" | "panosu" | "havuzu" | "kasa">("ask")
  const [loading, setLoading] = useState(false)

  const { data: epics = [], mutate: mutateEpics } = useSWR("/api/celf/epics", fetcher, { refreshInterval: 5000 })
  const { data: boardTasks = [], mutate: mutateBoard } = useSWR(
    activeTab === "panosu" ? "/api/celf/board" : null,
    fetcher,
    { refreshInterval: 3000 }
  )
  const { data: reviewTasks = [] } = useSWR(
    activeTab === "havuzu" ? "/api/celf/board?status=review" : null,
    fetcher,
    { refreshInterval: 3000 }
  )
  const { data: ledgerData, mutate: mutateLedger } = useSWR(
    activeTab === "kasa" ? "/api/celf/central-ledger" : null,
    fetcher
  )

  const handleCommand = async () => {
    if (!rawCommand.trim() || loading) return
    setLoading(true)
    try {
      const r = await fetch("/api/celf/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_command: rawCommand.trim() }),
      })
      const d = await r.json()
      if (d.epic_id) {
        setLastEpicId(d.epic_id)
        mutateEpics()
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePlan = async () => {
    if (!lastEpicId || loading) return
    setLoading(true)
    try {
      await fetch("/api/celf/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epic_id: lastEpicId }),
      })
      mutateBoard()
      mutateEpics()
    } finally {
      setLoading(false)
    }
  }

  const handleBrainTeam = async () => {
    if (!rawCommand.trim() || loading) return
    setLoading(true)
    setBrainTeamResult(null)
    setLastBrainEpicId(null)
    try {
      const parseRes = await fetch("/api/brain-team/parse-epic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patron_command: rawCommand.trim() }),
      })
      const parseData = await parseRes.json()
      if (!parseData.ok || !parseData.epic_id) {
        setBrainTeamResult({ directorates: [], tasks_created: 0 })
        return
      }
      setLastBrainEpicId(parseData.epic_id)
      const distRes = await fetch("/api/brain-team/distribute-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epic_id: parseData.epic_id }),
      })
      const distData = await distRes.json()
      setBrainTeamResult({
        directorates: parseData.directorates ?? [],
        tasks_created: distData.tasks_created ?? 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLock = async (taskId: string) => {
    try {
      await fetch("/api/celf/tasks/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      })
      mutateBoard()
    } catch {}
  }

  const handleComplete = async (taskId: string) => {
    try {
      await fetch("/api/celf/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          artifact: { type: "markdown", storage: "inline", content: "[Simülasyon] Tamamlandı" },
        }),
      })
      mutateBoard()
    } catch {}
  }

  const handleApprove = async (taskId: string, approved: boolean) => {
    try {
      await fetch("/api/celf/tasks/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, approved }),
      })
      mutateBoard()
    } catch {}
  }

  type BoardTask = { id: string; title: string; status: string; provider: string; target: string; directorate_code: string; lease_expires_at?: string }
  const tasksByDir = DIRECTORY_COLUMNS.reduce(
    (acc, c) => ({ ...acc, [c]: (boardTasks as BoardTask[]).filter((t) => t.directorate_code === c) }),
    {} as Record<string, BoardTask[]>
  )

  return (
    <div className="min-h-screen bg-[#0a0e17] text-[#e2e8f0] p-4">
      <div className="max-w-[1600px] mx-auto">
        <h1 className="text-xl font-bold text-[#00d4ff] mb-4 flex items-center gap-2">
          <Terminal className="w-6 h-6" />
          C2 Komut Merkezi
        </h1>

        <div className="flex gap-2 mb-4 border-b border-[#2a3650] pb-2">
          {(["ask", "komut", "panosu", "havuzu", "kasa"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                activeTab === t ? "bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]" : "border-[#2a3650] text-[#8892a8]"
              }`}
            >
              {t === "ask" && "ASK Ekrani"}
              {t === "komut" && "Komut Merkezi"}
              {t === "panosu" && "Gorev Panosu"}
              {t === "havuzu" && "Patron Havuzu"}
              {t === "kasa" && "Merkez Kasa"}
            </button>
          ))}
        </div>

        {activeTab === "ask" && (
          <AskScreen />
        )}

        {activeTab === "komut" && (
          <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
            <CardHeader>
              <CardTitle className="text-sm text-[#00d4ff]">Komut Ver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={rawCommand}
                onChange={(e) => setRawCommand(e.target.value)}
                placeholder="Örn: Franchise panelinde öğrenci CRUD modülü kur"
                className="w-full h-24 px-3 py-2 bg-[#111827] border border-[#2a3650] rounded text-sm text-[#e2e8f0] placeholder-[#6b7280]"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleCommand} disabled={loading} className="bg-[#00d4ff] hover:bg-[#00d4ff]/80 text-black">
                  Gönder (C2)
                </Button>
                <Button onClick={handleBrainTeam} disabled={loading} variant="outline" className="border-[#818cf8] text-[#818cf8] hover:bg-[#818cf8]/10">
                  Brain Team ile Gönder
                </Button>
                <Button onClick={handlePlan} disabled={!lastEpicId || loading} variant="outline" className="border-[#2a3650] text-[#8892a8]">
                  Parçala
                </Button>
              </div>
              {lastEpicId && <div className="text-xs text-[#10b981] font-mono">Son Epic (C2): {lastEpicId}</div>}
              {lastBrainEpicId && (
                <div className="text-xs text-[#818cf8] font-mono">
                  Brain Team Epic: {lastBrainEpicId}
                  {brainTeamResult && (
                    <span className="text-[#8892a8] ml-2">
                      — {brainTeamResult.directorates?.length ?? 0} direktörlük, {brainTeamResult.tasks_created ?? 0} görev
                    </span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {epics.slice(0, 5).map((e: { id: string; title: string; task_count?: number }) => (
                  <div key={e.id} className="p-2 rounded border border-[#2a3650] bg-[#111827]/50 text-xs">
                    <div className="font-medium truncate">{e.title}</div>
                    <div className="text-[#8892a8]">{e.task_count ?? 0} görev</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "panosu" && (
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {DIRECTORY_COLUMNS.map((dir) => (
                <div key={dir} className="w-40 flex-shrink-0 rounded border border-[#2a3650] bg-[#111827]/30 p-2">
                  <div className="text-[9px] font-mono text-[#00d4ff] mb-2">{dir}</div>
                  <div className="space-y-1.5">
                    {(tasksByDir[dir] || []).map((t: { id: string; title: string; status: string; provider: string; target: string; lease_expires_at?: string }) => (
                      <div
                        key={t.id}
                        className="p-1.5 rounded border text-[9px]"
                        style={{ borderColor: STATUS_COLORS[t.status] || "#2a3650", background: `${STATUS_COLORS[t.status] || "#2a3650"}10` }}
                      >
                        <div className="truncate mb-0.5">{t.title}</div>
                        <div className="flex gap-1 flex-wrap">
                          <span style={{ color: TARGET_COLORS[t.target] }}>{t.target}</span>
                          <span className="text-[#8892a8]">{t.provider}</span>
                        </div>
                        <div className="flex gap-0.5 mt-1">
                          {t.status === "queued" && (
                            <button onClick={() => handleLock(t.id)} className="text-[#f59e0b] hover:underline text-[8px]">
                              Kilit Al
                            </button>
                          )}
                          {t.status === "locked" && (
                            <button onClick={() => handleComplete(t.id)} className="text-[#10b981] hover:underline text-[8px]">
                              Tamamla
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "havuzu" && (
          <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
            <CardHeader>
              <CardTitle className="text-sm text-[#00d4ff]">Onay Bekleyenler (status=review)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reviewTasks.length === 0 && <div className="text-[#8892a8] text-sm">Onay bekleyen görev yok</div>}
                {reviewTasks.map((t: { id: string; title: string; target: string }) => (
                  <div key={t.id} className="p-3 rounded border border-[#8b5cf6]/40 bg-[#8b5cf6]/05">
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-xs text-[#8892a8] mt-1">Target: {t.target}</div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleApprove(t.id, true)} className="bg-[#10b981] hover:bg-[#10b981]/80 text-black">
                        Onayla
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleApprove(t.id, false)} className="border-[#ef4444] text-[#ef4444]">
                        Reddet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "kasa" && (
          <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
            <CardHeader>
              <CardTitle className="text-sm text-[#00d4ff] flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Merkez Kasa (Patron geliri)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ledgerData?.summary && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded border border-[#10b981]/30 bg-[#10b981]/05">
                    <div className="text-xs text-[#8892a8]">Toplam Gelir</div>
                    <div className="text-lg font-bold text-[#10b981]">{ledgerData.summary.total_income?.toLocaleString("tr-TR")} ₺</div>
                  </div>
                  <div className="p-3 rounded border border-[#ef4444]/30 bg-[#ef4444]/05">
                    <div className="text-xs text-[#8892a8]">Toplam Gider</div>
                    <div className="text-lg font-bold text-[#ef4444]">{ledgerData.summary.total_expense?.toLocaleString("tr-TR")} ₺</div>
                  </div>
                  <div className="p-3 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/05">
                    <div className="text-xs text-[#8892a8]">Bakiye</div>
                    <div className="text-lg font-bold text-[#00d4ff]">{ledgerData.summary.balance?.toLocaleString("tr-TR")} ₺</div>
                  </div>
                </div>
              )}
              <LedgerForm onSuccess={() => mutateLedger()} />
              <div className="mt-4 space-y-1 max-h-60 overflow-y-auto">
                {(ledgerData?.items || []).slice(0, 20).map((r: { id: string; amount: number; type: string; description?: string; created_at: string }) => (
                  <div key={r.id} className="flex justify-between py-1.5 text-xs border-b border-[#2a3650]/50">
                    <span>{r.description || "-"}</span>
                    <span className={r.type === "income" ? "text-[#10b981]" : "text-[#ef4444]"}>
                      {r.type === "income" ? "+" : "-"}{r.amount} ₺
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function LedgerForm({ onSuccess }: { onSuccess: () => void }) {
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"income" | "expense">("income")
  const [desc, setDesc] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    const n = parseFloat(amount)
    if (isNaN(n) || n <= 0) return
    setLoading(true)
    try {
      await fetch("/api/celf/central-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n, type, description: desc || undefined }),
      })
      setAmount("")
      setDesc("")
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 items-end mb-4">
      <div>
        <label className="text-[10px] text-[#8892a8]">Tutar</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="block w-24 px-2 py-1 bg-[#111827] border border-[#2a3650] rounded text-sm"
        />
      </div>
      <div>
        <label className="text-[10px] text-[#8892a8]">Tip</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "income" | "expense")}
          className="block w-24 px-2 py-1 bg-[#111827] border border-[#2a3650] rounded text-sm"
        >
          <option value="income">Gelir</option>
          <option value="expense">Gider</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="text-[10px] text-[#8892a8]">Açıklama</label>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Örn: Franchise lisans ödemesi"
          className="block w-full px-2 py-1 bg-[#111827] border border-[#2a3650] rounded text-sm"
        />
      </div>
      <Button onClick={submit} disabled={loading} size="sm" className="bg-[#10b981] hover:bg-[#10b981]/80 text-black">
        Kaydet
      </Button>
    </div>
  )
}
