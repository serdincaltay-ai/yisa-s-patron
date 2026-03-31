import { redirect } from "next/navigation"
import Link from "next/link"
import { cookies } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = cookieStore.get("patron_session")
  if (session?.value !== "authenticated") redirect("/")

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e2e8f0]">
      <header className="border-b border-[#0f3460]/40 px-4 py-3 flex items-center justify-between bg-[#0a0a1a]/95 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-base min-h-[44px] min-w-[44px] flex items-center justify-center -m-2 text-[#00d4ff]/80 hover:text-[#00d4ff] transition-colors"
            aria-label="Ana panele dön"
          >
            ← Panel
          </Link>
          <span className="text-[#8892a8]">|</span>
          <h1 className="text-base md:text-lg font-bold text-[#e2e8f0]">
            YİSA-S Patron
          </h1>
        </div>
      </header>
      <main className="max-w-[1920px] mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
