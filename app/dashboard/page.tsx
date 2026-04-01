import { redirect } from "next/navigation"

/**
 * Backward-compatible root dashboard route.
 * Some legacy flows still navigate to /dashboard after login.
 */
export default function DashboardIndexPage() {
  redirect("/patron/dashboard")
}
