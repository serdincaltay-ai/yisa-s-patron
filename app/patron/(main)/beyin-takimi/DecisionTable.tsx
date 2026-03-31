"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TableItem {
  robotName: string
  text: string
}

export default function DecisionTable({
  items,
  onClose,
  onHerkesGorus,
  onOylamayaGec,
  onPatronOnay,
}: {
  items: TableItem[]
  onClose: () => void
  onHerkesGorus: () => void
  onOylamayaGec: () => void
  onPatronOnay: () => void
}) {
  const [phase, setPhase] = useState<"tablo" | "oylama" | "patron">("tablo")
  const [votes, setVotes] = useState<Record<string, "ONAY" | "RED">>({})

  return (
    <div className="border border-[#0f3460]/40 rounded-xl bg-[#0a0a1a]/90 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#0f3460]/40">
        <h3 className="font-semibold text-[#e2e8f0]">Karar tablosu</h3>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] text-[#8892a8] hover:text-[#e2e8f0]"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0f3460]/40 bg-[#0f3460]/10">
              <th className="text-left py-2 px-3 font-medium text-[#00d4ff]">Robot</th>
              <th className="text-left py-2 px-3 font-medium text-[#00d4ff]">Öneri</th>
              {phase === "oylama" && (
                <th className="text-left py-2 px-3 font-medium text-[#00d4ff]">Oylama</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-[#0f3460]/20">
                <td className="py-2 px-3 text-[#e2e8f0] font-medium">{item.robotName}</td>
                <td className="py-2 px-3 text-[#8892a8] whitespace-pre-wrap">{item.text}</td>
                {phase === "oylama" && (
                  <td className="py-2 px-3">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        votes[item.robotName] === "ONAY"
                          ? "text-[#10b981]"
                          : votes[item.robotName] === "RED"
                            ? "text-[#e94560]"
                            : "text-[#8892a8]"
                      )}
                    >
                      {votes[item.robotName] ?? "—"}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 p-3 border-t border-[#0f3460]/40">
        {phase === "tablo" && (
          <>
            <Button
              size="sm"
              className="min-h-[44px] bg-[#0f3460]/80 text-[#00d4ff] hover:bg-[#0f3460] border border-[#00d4ff]/40"
              onClick={onHerkesGorus}
            >
              Herkes Görüş
            </Button>
            <Button
              size="sm"
              className="min-h-[44px] bg-[#0f3460]/80 text-[#00d4ff] hover:bg-[#0f3460] border border-[#00d4ff]/40"
              onClick={() => setPhase("oylama")}
            >
              Oylamaya Geç
            </Button>
          </>
        )}
        {phase === "oylama" && (
          <>
            <Button
              size="sm"
              className="min-h-[44px] bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
              onClick={() => {
                const next: Record<string, "ONAY" | "RED"> = {}
                items.forEach((item) => {
                  next[item.robotName] = Math.random() > 0.3 ? "ONAY" : "RED"
                })
                setVotes(next)
              }}
            >
              Oyları Al (Simülasyon)
            </Button>
            <Button
              size="sm"
              className="min-h-[44px] bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40"
              onClick={() => setPhase("patron")}
            >
              Patron Onayına Git
            </Button>
          </>
        )}
        {phase === "patron" && (
          <Button
            size="sm"
            className="min-h-[44px] bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/40"
            onClick={() => {
              onPatronOnay()
              onClose()
            }}
          >
            Patron Onayı
          </Button>
        )}
      </div>
    </div>
  )
}
