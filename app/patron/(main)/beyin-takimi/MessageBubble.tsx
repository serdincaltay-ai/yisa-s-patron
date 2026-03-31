"use client"

import { cn } from "@/lib/utils"

export type MessageRole = "patron" | "robot"

export interface ChatMessage {
  id: string
  role: MessageRole
  robotId?: string
  robotName?: string
  robotColor?: string
  content: string
  timestamp?: Date
  isStreaming?: boolean
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isPatron = message.role === "patron"

  if (isPatron) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[#0f3460]/60 border border-[#0f3460]/40 text-[#e2e8f0] text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  const bg = message.robotColor ? undefined : "rgba(15,52,96,0.2)"
  const borderColor = message.robotColor || "#0f3460"

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md px-4 py-2.5 border text-sm text-[#e2e8f0]"
        )}
        style={{
          backgroundColor: message.robotColor ? `${message.robotColor}1A` : bg,
          borderColor: `${borderColor}40`,
        }}
      >
        {message.robotName && (
          <div
            className="text-xs font-semibold mb-1"
            style={{ color: message.robotColor || "#00d4ff" }}
          >
            {message.robotName}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}
