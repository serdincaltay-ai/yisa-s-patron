"use client"

import { useState, useEffect, useCallback } from "react"
import { BEYIN_ROBOTS } from "@/lib/beyin-takimi/robots"
import type { BeyinMode } from "@/lib/beyin-takimi/robots"
import ModeSelector from "./ModeSelector"
import RobotList from "./RobotList"
import ChatPanel from "./ChatPanel"
import type { ChatMessage } from "./MessageBubble"
import type { RobotStatus } from "./RobotList"
import DirectorStatusBar from "./DirectorStatusBar"

export default function BeyinTakimiPage() {
  const [mode, setMode] = useState<BeyinMode>("tekli")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [robotStatus, setRobotStatus] = useState<RobotStatus | null>(null)

  useEffect(() => {
    fetch("/api/robot-status")
      .then((r) => r.json())
      .then(setRobotStatus)
      .catch(() => setRobotStatus(null))
  }, [])

  const handleRobotSelect = useCallback(
    (id: string) => {
      if (mode === "tekli") {
        setSelectedIds([id])
      } else if (mode === "coklu") {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        )
      }
    },
    [mode]
  )

  const lastMessages: Record<string, string> = {}
  messages
    .filter((m) => m.role === "robot" && m.robotName)
    .forEach((m) => {
      const r = BEYIN_ROBOTS.find((x) => x.id === m.robotId)
      if (r)
        lastMessages[r.memberId] =
          m.content.slice(0, 60) + (m.content.length > 60 ? "…" : "")
    })

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[320px]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          Beyin Takımı
        </h2>
        <ModeSelector value={mode} onChange={setMode} />
      </div>

      <DirectorStatusBar />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 mt-4">
        <aside className="flex flex-col min-w-0">
          <h3 className="text-sm font-medium text-[#00d4ff] mb-2">Robotlar</h3>
          <RobotList
            status={robotStatus}
            mode={mode}
            selectedIds={selectedIds}
            onSelect={handleRobotSelect}
            lastMessages={lastMessages}
          />
        </aside>
        <section className="md:col-span-2 flex flex-col min-h-0 rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
          <ChatPanel
            mode={mode}
            selectedRobotIds={selectedIds}
            robotStatus={robotStatus}
            messages={messages}
            setMessages={setMessages}
          />
        </section>
      </div>
    </div>
  )
}
