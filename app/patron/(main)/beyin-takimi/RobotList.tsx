"use client"

import { useEffect, useState } from "react"
import { BEYIN_ROBOTS } from "@/lib/beyin-takimi/robots"
import type { BeyinMode } from "@/lib/beyin-takimi/robots"
import { cn } from "@/lib/utils"

export interface RobotStatus {
  [memberId: string]: boolean
}

export default function RobotList({
  status,
  mode,
  selectedIds,
  onSelect,
  lastMessages,
}: {
  status: RobotStatus | null
  mode: BeyinMode
  selectedIds: string[]
  onSelect: (id: string) => void
  lastMessages: Record<string, string>
}) {
  const [online, setOnline] = useState<RobotStatus | null>(status)

  useEffect(() => {
    if (status) setOnline(status)
  }, [status])

  const isSelected = (id: string) => selectedIds.includes(id)

  return (
    <div className="flex flex-col gap-2">
      {BEYIN_ROBOTS.map((robot) => {
        const isOnline = online?.[robot.memberId] ?? false
        const lastMsg = lastMessages[robot.memberId] ?? ""
        const selected = isSelected(robot.id)
        return (
          <button
            key={robot.id}
            type="button"
            onClick={() => onSelect(robot.id)}
            className={cn(
              "min-h-[44px] w-full text-left rounded-xl border p-3 transition-all",
              selected
                ? "border-[#00d4ff]/60 bg-[#0f3460]/40"
                : "border-[#0f3460]/40 bg-[#0a0a1a]/80 hover:bg-[#0f3460]/20"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: robot.bgColor, color: robot.color }}
              >
                {robot.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#e2e8f0] truncate">
                    {robot.name}
                  </span>
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      isOnline ? "bg-[#10b981]" : "bg-[#e94560]"
                    )}
                    title={isOnline ? "Çevrimiçi" : "Çevrimdışı"}
                  />
                </div>
                <div className="text-xs text-[#8892a8] truncate">
                  {robot.engine}
                </div>
              </div>
            </div>
            {lastMsg && (
              <p className="text-xs text-[#8892a8]/80 mt-1.5 truncate pl-11">
                {lastMsg}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
