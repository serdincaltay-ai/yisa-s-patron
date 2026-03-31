import { redirect } from "next/navigation"
import { cookies } from "next/headers"

/**
 * Patron root layout — auth guard only.
 * Chrome (header + sidebars) lives in (main)/layout.tsx so the (tablet) route
 * group gets a clean viewport without double-nesting.
 */
export default async function PatronLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = cookieStore.get("patron_session")
  if (session?.value !== "authenticated") redirect("/")

  return <>{children}</>
}
