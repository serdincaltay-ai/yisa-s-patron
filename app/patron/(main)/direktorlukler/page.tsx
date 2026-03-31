import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import DirectorCard from "./DirectorCard"

export const metadata = {
  title: "Direktörlükler | YİSA-S Patron",
  description: "CELF 12 Direktörlük — Hukuk, Muhasebe, Teknik, Tasarım ve diğerleri",
}

interface BoardStats {
  total: number
  completed: number
  running: number
  failed: number
}

interface BoardTask {
  id: string
  directorate: string
  task_description: string
  status: string
  created_at?: string
  patron_command?: string
}

interface BoardEpic {
  id: string
  patron_command?: string | null
  raw_command?: string | null
  status?: string
  parsed_directorates?: string[]
  tasksFlat?: BoardTask[]
}

interface BoardResponse {
  epics?: BoardEpic[] | null
  stats?: Partial<BoardStats> | null
}

function safeStats(stats: Partial<BoardStats> | null | undefined): BoardStats {
  return {
    total: Number(stats?.total) || 0,
    completed: Number(stats?.completed) || 0,
    running: Number(stats?.running) || 0,
    failed: Number(stats?.failed) || 0,
  }
}

export default async function DirektorluklerPage() {
  let boardData: BoardResponse | null = null

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${base}/api/celf/tasks/board`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (res.ok) {
      const data = (await res.json()) as BoardResponse
      boardData = data ?? null
    }
  } catch {
    boardData = null
  }

  const stats = safeStats(boardData?.stats ?? null)
  const epics = Array.isArray(boardData?.epics) ? boardData.epics : []
  const latestTaskByDirectorate = new Map<string, { task: BoardTask; command: string }>()
  for (const epic of epics) {
    const tasks = Array.isArray(epic.tasksFlat) ? epic.tasksFlat : []
    for (const task of tasks) {
      if (!task?.directorate || latestTaskByDirectorate.has(task.directorate)) continue
      const command = (epic.patron_command ?? epic.raw_command ?? task.task_description ?? "").trim()
      latestTaskByDirectorate.set(task.directorate, { task, command })
    }
  }

  const list = Array.isArray(DIREKTORLUKLER) ? DIREKTORLUKLER : []

  try {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
            Direktörlükler
          </h2>
          <p className="text-sm text-[#8892a8] mt-1">
            CELF motoru — 12 direktörlük. Her biri için kurallar ve görev geçmişi.
          </p>
          {stats.total > 0 && (
            <p className="text-xs text-[#8892a8] mt-2 font-mono">
              Toplam {stats.total} görev · {stats.running} çalışıyor · {stats.completed} tamamlandı
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((d, index) => {
            if (!d || typeof d !== "object" || !d.slug) return null
            const latest = latestTaskByDirectorate.get(d.code)
            const lastCommand = latest?.command ? latest.command.slice(0, 60) : undefined
            return (
              <DirectorCard
                key={d.slug ?? `dir-${index}`}
                directorate={d}
                lastCommand={lastCommand}
              />
            )
          })}
        </div>
        {epics.length > 0 && (
          <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/60 p-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0] mb-2">Son komutlar</h3>
            <ul className="space-y-2">
              {epics.slice(0, 5).map((epic) => {
                const id = epic?.id ?? ""
                const cmd = (epic?.patron_command ?? epic?.raw_command ?? "").slice(0, 80)
                return (
                  <li key={id} className="text-xs font-mono text-[#8892a8] truncate">
                    {cmd || "(komut yok)"}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bir hata oluştu"
    return (
      <div className="rounded-xl border border-[#e94560]/40 bg-[#e94560]/5 p-6 text-center">
        <h3 className="text-lg font-semibold text-[#e2e8f0]">Yüklenemedi</h3>
        <p className="text-sm text-[#8892a8] mt-2">{message}</p>
      </div>
    )
  }
}
