"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import AskPanel from "./AskPanel"
import SessionPanel from "./SessionPanel"
import TaleplerPanel from "./TaleplerPanel"

export type PatronTab = "ask" | "session" | "talepler"

const TABS: { id: PatronTab; label: string }[] = [
  { id: "ask", label: "ASK" },
  { id: "session", label: "SESSION" },
  { id: "talepler", label: "TALEPLER" },
]

export default function PatronHub() {
  const [activeTab, setActiveTab] = useState<PatronTab>("ask")

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-[#0f3460]/40 px-4 py-2 flex items-center gap-2 bg-[#0a0a1a]/90">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "px-4 py-2 rounded-md font-mono text-sm font-medium transition-colors min-h-[44px]",
              activeTab === id
                ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                : "text-[#8892a8] hover:text-[#e2e8f0] hover:bg-[#0f3460]/20"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {activeTab === "ask" && <AskPanel />}
        {activeTab === "session" && <SessionPanel />}
        {activeTab === "talepler" && <TaleplerPanel />}
      </div>
    </div>
  )
}
