import { createAdminClient } from "@/lib/supabase/admin"
import ActiveRobotsClient from "./ActiveRobotsClient"

export const metadata = {
  title: "Aktif Robotlar | YİSA-S Patron",
  description: "Tenant'a atanmis aktif robotlar ve gorev durumlari",
}

/**
 * Aktif Robotlar sayfasi — tenant'a atanmis robotlari gosterir.
 */
export default async function AktifRobotlarPage() {
  const supabase = createAdminClient()

  // Ilk aktif tenant'i al
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, ad")
    .eq("durum", "aktif")
    .order("ad")
    .limit(1)

  const tenant = tenants?.[0] ?? null
  const tenantId = tenant?.id ?? null

  let robots: {
    id: string
    robot_id: string
    robot_name: string
    category: string
    status: string
    task_count: number
    last_active: string | null
    created_at: string
  }[] = []

  if (tenantId) {
    const { data } = await supabase
      .from("tenant_robots")
      .select("id, robot_id, robot_name, category, status, task_count, last_active, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    robots = data ?? []
  }

  return (
    <div className="p-6">
      <ActiveRobotsClient
        robots={robots}
        tenantName={tenant?.ad ?? null}
      />
    </div>
  )
}
