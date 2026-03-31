"use client"

import { BEYIN_MODES } from "@/lib/beyin-takimi/robots"
import type { BeyinMode } from "@/lib/beyin-takimi/robots"
import { cn } from "@/lib/utils"

export default function ModeSelector({
  value,
  onChange,
}: {
  value: BeyinMode
  onChange: (mode: BeyinMode) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {BEYIN_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            "min-h-[44px] min-w-[44px] px-4 rounded-lg border text-sm font-medium transition-colors",
            value === m.value
              ? "bg-[#0f3460] border-[#00d4ff]/50 text-[#00d4ff]"
              : "border-[#0f3460]/50 text-[#8892a8] hover:bg-[#0f3460]/20 hover:text-[#e2e8f0]"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
