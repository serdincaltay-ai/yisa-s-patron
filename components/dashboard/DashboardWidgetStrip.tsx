"use client"

import { useState, useEffect } from "react"
import { getWidgetPrefs, WIDGET_LABELS } from "@/lib/dashboard-widgets"
import TokenMaliyetWidget from "./TokenMaliyetWidget"
import RobotStatusWidget from "./RobotStatusWidget"
import OnaySayisiWidget from "./OnaySayisiWidget"
import GorevlerWidget from "./GorevlerWidget"
import ApiMaliyetWidget from "./ApiMaliyetWidget"

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  token: TokenMaliyetWidget,
  robotStatus: RobotStatusWidget,
  onaySayisi: OnaySayisiWidget,
  gorevler: GorevlerWidget,
  apiMaliyet: ApiMaliyetWidget,
}

function PlaceholderWidget({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#2a3650] p-4 min-w-[200px] flex items-center justify-center text-[#8892a8] text-xs">
      {label}
    </div>
  )
}

export default function DashboardWidgetStrip() {
  const [prefs, setPrefs] = useState(getWidgetPrefs)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const handler = () => setPrefs(getWidgetPrefs())
    window.addEventListener("dashboard-widget-prefs-change", handler)
    return () => window.removeEventListener("dashboard-widget-prefs-change", handler)
  }, [mounted])

  if (!mounted) return null

  const visibleOrdered = prefs.order.filter((id) => prefs.visible[id] !== false)
  if (visibleOrdered.length === 0) return null

  return (
    <section className="border-b border-[#2a3650] px-4 py-2 flex-shrink-0 bg-[#0a0e17]/30">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {visibleOrdered.map((id) => {
          const Component = WIDGET_COMPONENTS[id]
          const label = WIDGET_LABELS[id as keyof typeof WIDGET_LABELS] ?? id
          return Component ? (
            <div key={id} className="flex-shrink-0 w-72">
              <Component />
            </div>
          ) : (
            <PlaceholderWidget key={id} label={label} />
          )
        })}
      </div>
    </section>
  )
}
