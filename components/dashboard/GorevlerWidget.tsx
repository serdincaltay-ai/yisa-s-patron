"use client"

import useSWR from "swr"
import { ListChecks } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TaskRow {
  status?: string | null
}

interface TasksResponse {
  data?: TaskRow[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<TasksResponse>
}

export default function GorevlerWidget() {
  const { data, error } = useSWR("/api/ceo-tasks", fetcher, { refreshInterval: 45000 })
  const tasks = data?.data ?? []

  const backlog = tasks.filter((task) => task.status === "BACKLOG").length
  const review = tasks.filter((task) => task.status === "REVIEW").length
  const done = tasks.filter((task) => task.status === "DONE").length
  const active = tasks.filter((task) => task.status === "READY" || task.status === "REVIEW").length

  return (
    <Card className="bg-[#0a0e17]/80 border-[#2a3650]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-[#06b6d4]">Görevler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-[#2a3650]/60 bg-[#0a0e17]/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#8892a8]">Aktif akış</span>
            <ListChecks className="h-3.5 w-3.5 text-[#06b6d4]" />
          </div>
          <div className="text-xl font-bold text-[#06b6d4] font-mono mt-1">{active}</div>
        </div>

        {error ? (
          <p className="text-[11px] text-[#ef4444] font-mono">Görev özeti alınamadı.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded border border-[#2a3650]/60 bg-[#0a0e17]/60 px-2 py-1.5">
              <p className="text-[9px] text-[#94a3b8] font-mono">Backlog</p>
              <p className="text-xs font-semibold text-[#e2e8f0]">{backlog}</p>
            </div>
            <div className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1.5">
              <p className="text-[9px] text-amber-300 font-mono">Review</p>
              <p className="text-xs font-semibold text-amber-300">{review}</p>
            </div>
            <div className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5">
              <p className="text-[9px] text-emerald-300 font-mono">Done</p>
              <p className="text-xs font-semibold text-emerald-300">{done}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
