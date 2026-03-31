"use client"

import PanelSidebar from "./PanelSidebar"
import type { SidebarLink } from "./PanelSidebar"

interface PanelLayoutProps {
  title: string
  subtitle?: string
  links: SidebarLink[]
  accentColor?: string
  children: React.ReactNode
}

export default function PanelLayout({ title, subtitle, links, accentColor, children }: PanelLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <PanelSidebar title={title} subtitle={subtitle} links={links} accentColor={accentColor} />
      <main className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
