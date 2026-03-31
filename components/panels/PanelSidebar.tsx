"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"

export interface SidebarLink {
  href: string
  label: string
  icon: LucideIcon
}

interface PanelSidebarProps {
  title: string
  subtitle?: string
  links: SidebarLink[]
  accentColor?: string
}

export default function PanelSidebar({ title, subtitle, links, accentColor = "cyan" }: PanelSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const colorMap: Record<string, { bg: string; text: string; border: string; hover: string; active: string }> = {
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", hover: "hover:bg-cyan-500/5", active: "bg-cyan-500/15 border-cyan-500/30" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", hover: "hover:bg-emerald-500/5", active: "bg-emerald-500/15 border-emerald-500/30" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", hover: "hover:bg-amber-500/5", active: "bg-amber-500/15 border-amber-500/30" },
    indigo: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20", hover: "hover:bg-indigo-500/5", active: "bg-indigo-500/15 border-indigo-500/30" },
    red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", hover: "hover:bg-red-500/5", active: "bg-red-500/15 border-red-500/30" },
    orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", hover: "hover:bg-orange-500/5", active: "bg-orange-500/15 border-orange-500/30" },
  }
  const colors = colorMap[accentColor] ?? colorMap.cyan

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col z-40">
      {/* Header */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <Link href="/auth/login" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs mb-3 transition-colors">
          <ChevronLeft className="w-3 h-3" />
          <span className="font-sans">Ana Sayfa</span>
        </Link>
        <h2 className={`text-lg font-bold ${colors.text} font-sans tracking-wide`}>{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 font-sans mt-0.5">{subtitle}</p>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans transition-all border border-transparent ${
                isActive
                  ? `${colors.active} ${colors.text}`
                  : `text-zinc-400 ${colors.hover} hover:text-zinc-200`
              }`}
            >
              <link.icon className={`w-4 h-4 ${isActive ? colors.text : "text-zinc-500"}`} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-sans text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all w-full border border-transparent"
        >
          <LogOut className="w-4 h-4" />
          \u00c7\u0131k\u0131\u015f Yap
        </button>
      </div>
    </aside>
  )
}
