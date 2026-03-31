"use client"

import { useEffect, useState } from "react"

type BoardStats = { total: number; completed: number; running: number; failed: number }
type RobotStats = { tokenTotal: number; tokenThisMonth: number; tenantsCount: number }

export default function PatronSidebarRight() {
  const [board, setBoard] = useState<{ stats?: BoardStats } | null>(null)
  const [robot, setRobot] = useState<RobotStats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/celf/tasks/board").then((r) => r.json()).then(setBoard).catch(() => setBoard(null)),
      fetch("/api/robot-stats").then((r) => r.json()).then((d) => d && setRobot({ tokenTotal: d.tokenTotal ?? 0, tokenThisMonth: d.tokenThisMonth ?? 0, tenantsCount: d.tenantsCount ?? 0 })).catch(() => setRobot(null)),
    ])
  }, [])

  const stats = board?.stats ?? { total: 0, completed: 0, running: 0, failed: 0 }
  const tokenTotal = robot?.tokenTotal ?? 0
  const tokenMonth = robot?.tokenThisMonth ?? 0
  const tenantsCount = robot?.tenantsCount ?? 0

  return (
    <aside className="flex flex-col h-full border-l border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
      <div className="p-4 space-y-4">
        <h3 className="text-xs font-semibold text-[#00d4ff]/90 uppercase tracking-wider">
          Beyin Takımı
        </h3>

        <div className="space-y-2">
          <p className="text-xs text-[#8892a8]">Token durumu</p>
          <p className="text-lg font-mono font-bold text-[#e2e8f0]">
            ${tokenTotal.toFixed(2)} <span className="text-xs font-normal text-[#8892a8]">toplam</span>
          </p>
          <p className="text-sm text-[#8892a8]">Bu ay: ${tokenMonth.toFixed(2)}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#8892a8]">Aktif tenant</p>
          <p className="text-xl font-bold text-[#e2e8f0]">{tenantsCount}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#8892a8]">Direktör durumları (CELF)</p>
          <ul className="text-sm space-y-1">
            <li className="flex justify-between"><span className="text-[#8892a8]">Toplam</span><span className="font-mono text-[#e2e8f0]">{stats.total}</span></li>
            <li className="flex justify-between"><span className="text-[#10b981]">Tamamlandı</span><span className="font-mono">{stats.completed}</span></li>
            <li className="flex justify-between"><span className="text-[#f59e0b]">Çalışıyor</span><span className="font-mono">{stats.running}</span></li>
            <li className="flex justify-between"><span className="text-[#ef4444]">Başarısız</span><span className="font-mono">{stats.failed}</span></li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
