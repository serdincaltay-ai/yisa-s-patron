import { createAdminClient } from "@/lib/supabase/admin"
import StoreClient from "./StoreClient"

export const metadata = {
  title: "COO Magazasi | YİSA-S Patron",
  description: "Robot ve paket satin alma magazasi",
}

/**
 * COO Magazasi — Robot/Paket satin alma sayfasi.
 * Patron panelinde yeni section olarak yer alir.
 */
export default async function MagazasiPage() {
  const supabase = createAdminClient()

  // Ilk tenant'i varsayilan olarak al (ileride tenant secimi eklenebilir)
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, ad, slug")
    .eq("durum", "aktif")
    .order("ad")
    .limit(1)

  const tenantId = tenants?.[0]?.id ?? null

  // Mevcut satin alimlar ve aktif robotlar
  let ownedRobotIds: string[] = []
  let ownedPackageIds: string[] = []

  if (tenantId) {
    const [purchasesRes, robotsRes] = await Promise.all([
      supabase
        .from("store_purchases")
        .select("item_type, item_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("tenant_robots")
        .select("robot_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
    ])

    const purchases = purchasesRes.data ?? []
    ownedPackageIds = purchases
      .filter((p) => p.item_type === "package")
      .map((p) => p.item_id)
    ownedRobotIds = (robotsRes.data ?? []).map((r) => r.robot_id)
  }

  return (
    <div className="p-6">
      <StoreClient
        tenantId={tenantId}
        ownedRobotIds={ownedRobotIds}
        ownedPackageIds={ownedPackageIds}
      />
    </div>
  )
}
