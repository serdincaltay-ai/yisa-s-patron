import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError } from "@/lib/errors"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/store/active-robots?tenantId=xxx
 * Tenant'in aktif robotlarini listeler.
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")

    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ robots: [] })
    }

    const { data: robots, error } = await supabase
      .from("tenant_robots")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error("Aktif robotlar getirilemedi")
    }

    return NextResponse.json({
      robots: robots ?? [],
    })
  })
}
