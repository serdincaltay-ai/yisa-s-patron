import Link from "next/link"
import PatronSidebarLeft from "../components/PatronSidebarLeft"
import PatronSidebarRight from "../components/PatronSidebarRight"

/**
 * (main) route group layout — header + 3-column sidebar chrome.
 * Only applies to classic patron pages (dashboard, tenants, etc.),
 * NOT the tablet view which lives in (tablet) route group.
 */
export default function PatronMainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e2e8f0] relative overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(#00d4ff 1px, transparent 1px),
            linear-gradient(90deg, #00d4ff 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      <header className="relative z-10 border-b border-[#0f3460]/40 px-4 py-3 flex items-center justify-between bg-[#0a0a1a]/95 sticky top-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-mono text-[#00d4ff]/80 hover:text-[#00d4ff] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -m-2"
            aria-label="Ana panele dön"
          >
            ← Panel
          </Link>
          <span className="text-[#8892a8] font-mono text-xs">|</span>
          <h1 className="text-base md:text-lg font-bold text-[#e2e8f0] font-mono tracking-wide">
            YİSA-S
          </h1>
        </div>
        <nav className="flex items-center gap-2 font-mono text-sm text-[#8892a8]">
          <span>ASK</span>
          <span>·</span>
          <span>SESSION</span>
          <span>·</span>
          <span>TALEPLER</span>
        </nav>
        <div className="flex items-center gap-2 text-sm text-[#10b981]">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          Patron · Çevrimiçi
        </div>
      </header>

      <div className="relative z-10 flex h-[calc(100vh-56px)]">
        <div className="w-[220px] flex-shrink-0 hidden md:block">
          <PatronSidebarLeft />
        </div>
        <main className="flex-1 min-w-0 overflow-auto border-x border-[#0f3460]/20">
          {children}
        </main>
        <div className="w-[240px] flex-shrink-0 hidden lg:block">
          <PatronSidebarRight />
        </div>
      </div>
    </div>
  )
}
