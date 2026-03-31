"use client"

import Link from "next/link"
import { DollarSign, Building2, LayoutTemplate, BookOpen, Store, Bot, ImageIcon } from "lucide-react"
import dynamic from "next/dynamic"

const DIRECTORATES = [
  "CFO", "CTO", "CMO", "CLO", "CPO", "CHRO", "CCO", "CISO", "CDO", "CSO", "CRDO", "CSPO",
]

const LottieAvatar = dynamic(
  () => import("./LottieAvatar").then((m) => m.LottieAvatar),
  { ssr: false }
)

export default function PatronSidebarLeft() {
  return (
    <aside className="flex flex-col h-full border-r border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
      <div className="flex-shrink-0 p-4 flex justify-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-[#0f3460]/30 flex items-center justify-center">
          <LottieAvatar />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <h3 className="text-xs font-semibold text-[#00d4ff]/90 uppercase tracking-wider mb-2 px-1">
          12 Direktörlük
        </h3>
        <ul className="space-y-1">
          {DIRECTORATES.map((key) => (
            <li key={key}>
              <span className="block text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono">
                {key}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="text-xs font-semibold text-[#00d4ff]/90 uppercase tracking-wider mt-4 mb-2 px-1">
          Menü
        </h3>
        <ul className="space-y-1">
          <li>
            <Link
              href="/patron/tenants"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <Building2 className="w-4 h-4 text-[#00d4ff]" />
              Franchise
            </Link>
          </li>
          <li>
            <Link
              href="/patron/sablon-havuzu"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <LayoutTemplate className="w-4 h-4 text-[#8b5cf6]" />
              Şablon Havuzu
            </Link>
          </li>
          <li>
            <Link
              href="/patron/sablonlar"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-[#00d4ff]" />
              Şablon Galerisi
            </Link>
          </li>
          <li>
            <Link
              href="/patron/finans"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <DollarSign className="w-4 h-4 text-[#10b981]" />
              Finans
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/kasa-defteri"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#f59e0b]" />
              Kasa Defteri
            </Link>
          </li>
          <li>
            <Link
              href="/patron/magazasi"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <Store className="w-4 h-4 text-[#f472b6]" />
              COO Magazasi
            </Link>
          </li>
          <li>
            <Link
              href="/patron/aktif-robotlar"
              className="flex items-center gap-2 text-sm text-[#e2e8f0]/90 py-1.5 px-2 rounded-md hover:bg-[#0f3460]/30 font-mono transition-colors"
            >
              <Bot className="w-4 h-4 text-[#22d3ee]" />
              Aktif Robotlar
            </Link>
          </li>
        </ul>
      </div>
    </aside>
  )
}
