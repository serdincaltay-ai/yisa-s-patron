import { redirect } from "next/navigation"
import { cookies } from "next/headers"

/**
 * Tablet layout — uses a Next.js route group (tablet) to break the
 * patron layout nesting, so no header or constrained <main> wrapper
 * is rendered. The tablet frame fills the entire viewport.
 */
export default async function TabletLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = cookieStore.get("patron_session")
  if (session?.value !== "authenticated") redirect("/")

  return <>{children}</>
}
