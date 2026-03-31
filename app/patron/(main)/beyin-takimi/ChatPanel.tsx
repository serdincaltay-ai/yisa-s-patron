"use client"

import { useRef, useEffect, useState } from "react"
import { BEYIN_ROBOTS } from "@/lib/beyin-takimi/robots"
import type { BeyinMode } from "@/lib/beyin-takimi/robots"
import MessageBubble, { type ChatMessage } from "./MessageBubble"
import DecisionTable from "./DecisionTable"
import { cn } from "@/lib/utils"

export interface RobotStatus {
  [memberId: string]: boolean
}

export default function ChatPanel({
  mode,
  selectedRobotIds,
  robotStatus,
  messages,
  setMessages,
}: {
  mode: BeyinMode
  selectedRobotIds: string[]
  robotStatus: RobotStatus | null
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [tableItems, setTableItems] = useState<{ robotName: string; text: string }[]>([])
  const [showTable, setShowTable] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const getTargetMemberIds = (): string[] => {
    const allMemberIds = BEYIN_ROBOTS.map((r) => r.memberId)
    if (mode === "hepsi" || mode === "zincir") return allMemberIds
    return selectedRobotIds
      .map((id) => BEYIN_ROBOTS.find((r) => r.id === id)?.memberId)
      .filter(Boolean) as string[]
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const targets = getTargetMemberIds()
    if (mode === "tekli" && targets.length === 0) {
      return
    }
    if ((mode === "tekli" || mode === "coklu") && targets.length === 0) {
      return
    }

    const patronMsg: ChatMessage = {
      id: `patron-${Date.now()}`,
      role: "patron",
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, patronMsg])
    setInput("")
    setLoading(true)

    const savedResponses: { memberId: string; robotName?: string; content: string }[] = []
    const isZincir = mode === "zincir"
    const order = isZincir ? [...targets] : targets

    const runOne = async (
      memberId: string,
      robot: (typeof BEYIN_ROBOTS)[number],
      contextSoFar: string
    ): Promise<{ reply: string; ok: boolean }> => {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          message: text,
          section: "beyin-takimi",
          mode: "yorum",
          context: contextSoFar || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      const reply = data.text?.trim() || (data.error ? `Hata: ${data.error}` : "Yanıt alınamadı.")
      return { reply, ok: !data.error }
    }

    if (isZincir) {
      const contextParts: string[] = []
      for (let i = 0; i < order.length; i++) {
        const memberId = order[i]
        const robot = BEYIN_ROBOTS.find((r) => r.memberId === memberId)
        const isOnline = robotStatus?.[memberId] ?? false
        if (!robot) continue
        if (!isOnline) {
          setMessages((prev) => [
            ...prev,
            {
              id: `offline-${robot.memberId}-${Date.now()}`,
              role: "robot",
              robotId: robot.id,
              robotName: robot.name,
              robotColor: robot.color,
              content: `${robot.name} şu an çevrimdışı.`,
            },
          ])
          continue
        }
        const { reply, ok } = await runOne(robot.memberId, robot, contextParts.join("\n\n"))
        if (ok) {
          contextParts.push(`${robot.name}: ${reply}`)
          savedResponses.push({ memberId: robot.memberId, robotName: robot.name, content: reply })
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `robot-${robot.memberId}-${Date.now()}-${i}`,
            role: "robot",
            robotId: robot.id,
            robotName: robot.name,
            robotColor: robot.color,
            content: reply,
            timestamp: new Date(),
          },
        ])
      }
    } else {
      const results = await Promise.all(
        order.map(async (memberId) => {
          const robot = BEYIN_ROBOTS.find((r) => r.memberId === memberId)
          const isOnline = robotStatus?.[memberId] ?? false
          if (!robot) return null
          if (!isOnline) {
            return {
              type: "offline" as const,
              msg: {
                id: `offline-${robot.memberId}-${Date.now()}`,
                role: "robot" as const,
                robotId: robot.id,
                robotName: robot.name,
                robotColor: robot.color,
                content: `${robot.name} şu an çevrimdışı.`,
              },
            }
          }
          const { reply, ok } = await runOne(robot.memberId, robot, "")
          if (ok) savedResponses.push({ memberId: robot.memberId, robotName: robot.name, content: reply })
          return {
            type: "reply" as const,
            msg: {
              id: `robot-${robot.memberId}-${Date.now()}`,
              role: "robot" as const,
              robotId: robot.id,
              robotName: robot.name,
              robotColor: robot.color,
              content: reply,
              timestamp: new Date(),
            },
          }
        })
      )
      const newMessages: ChatMessage[] = results
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => r.msg)
      setMessages((prev) => [...prev, ...newMessages])
    }

    setLoading(false)

    if (savedResponses.length > 0) {
      fetch("/api/brain-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          mode,
          responses: savedResponses,
        }),
      }).catch(() => {})
    }
  }

  const handleTabloyaCek = () => {
    const robotMessages = messages.filter((m) => m.role === "robot" && m.robotName && m.content)
    const items = robotMessages.map((m) => ({
      robotName: m.robotName!,
      text: m.content,
    }))
    setTableItems(items)
    setShowTable(true)
  }

  const canSend =
    (mode === "hepsi" || mode === "zincir" || selectedRobotIds.length > 0) && !loading

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[#8892a8] text-center py-8">
            Mesaj yazıp gönderin. Moda göre seçili veya tüm robotlar yanıt verecek.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      {showTable && (
        <DecisionTable
          items={tableItems}
          onClose={() => setShowTable(false)}
          onHerkesGorus={() => setShowTable(false)}
          onOylamayaGec={() => setShowTable(false)}
          onPatronOnay={() => setShowTable(false)}
        />
      )}

      <div className="border-t border-[#0f3460]/40 p-3 bg-[#0a0a1a]/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Mesajınızı yazın…"
            className="flex-1 min-h-[44px] rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a] px-4 text-[#e2e8f0] placeholder:text-[#8892a8]/60 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40"
            disabled={loading}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canSend || !input.trim()}
            className={cn(
              "min-h-[44px] min-w-[44px] px-4 rounded-lg font-medium transition-colors",
              canSend && input.trim()
                ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
                : "bg-[#0f3460]/30 text-[#8892a8] border border-[#0f3460]/40 cursor-not-allowed"
            )}
          >
            {loading ? "…" : "Gönder"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={handleTabloyaCek}
            className="min-h-[44px] px-3 rounded-lg border border-[#0f3460]/40 text-[#8892a8] hover:bg-[#0f3460]/20 text-sm"
          >
            Tabloya Çek
          </button>
        </div>
      </div>
    </div>
  )
}
