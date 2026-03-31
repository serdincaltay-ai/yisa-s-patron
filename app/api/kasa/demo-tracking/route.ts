import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { log } from "@/lib/logger"

/**
 * GET /api/kasa/demo-tracking — Demo hesap takibi
 * GOREV #14: Demo suresi (30 gun), demo → tam uyelik donusumu
 *
 * Response:
 * - Aktif demo hesaplari (demo_expires_at > now)
 * - Suresi dolan demo hesaplari
 * - Donusen (converted to full) demo hesaplari
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // "active" | "expired" | "converted" | null (all)
    const limit = Math.min(200, parseInt(searchParams.get("limit") || "50", 10) || 50)

    // Demo request'leri getir (converted status = demo olarak onaylanmis)
    let query = supabase
      .from("demo_requests")
      .select("id, name, email, phone, facility_type, city, status, demo_user_id, demo_expires_at, demo_started_at, payment_status, payment_amount, payment_at, created_at")
      .not("demo_expires_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (filter === "active") {
      query = query.gt("demo_expires_at", new Date().toISOString())
        .is("payment_status", null)
    } else if (filter === "expired") {
      query = query.lt("demo_expires_at", new Date().toISOString())
        .is("payment_status", null)
    } else if (filter === "converted") {
      query = query.eq("payment_status", "paid")
    }

    const { data, error } = await query

    if (error) {
      log.error("Demo tracking fetch error", new Error(error.message))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = new Date()
    const demos = (data || []).map((d) => {
      const expiresAt = d.demo_expires_at ? new Date(d.demo_expires_at) : null
      const startedAt = d.demo_started_at ? new Date(d.demo_started_at) : null
      const isExpired = expiresAt ? expiresAt < now : false
      const daysRemaining = expiresAt
        ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null
      const totalDays = startedAt && expiresAt
        ? Math.ceil((expiresAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 30

      return {
        ...d,
        is_expired: isExpired,
        days_remaining: daysRemaining,
        total_days: totalDays,
        demo_status: d.payment_status === "paid"
          ? "converted"
          : isExpired
            ? "expired"
            : "active",
      }
    })

    // Ozet istatistikler
    const summary = {
      total: demos.length,
      active: demos.filter((d) => d.demo_status === "active").length,
      expired: demos.filter((d) => d.demo_status === "expired").length,
      converted: demos.filter((d) => d.demo_status === "converted").length,
    }

    return NextResponse.json({ data: demos, summary })
  } catch (e) {
    log.error("Demo tracking API error", e instanceof Error ? e : new Error(String(e)))
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/**
 * PATCH /api/kasa/demo-tracking — Demo → tam uyelik donusumu
 * Body: { demo_request_id: string, payment_amount: number, payment_notes?: string }
 */
export async function PATCH(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { demo_request_id, payment_amount, payment_notes } = body

    if (!demo_request_id || typeof payment_amount !== "number" || payment_amount <= 0 || !isFinite(payment_amount)) {
      return NextResponse.json(
        { error: "demo_request_id ve gecerli bir payment_amount (> 0) zorunludur" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Demo request'i bul
    const { data: demoReq, error: fetchError } = await supabase
      .from("demo_requests")
      .select("id, name, email, phone, demo_user_id, demo_expires_at, status, payment_status")
      .eq("id", demo_request_id)
      .single()

    if (fetchError || !demoReq) {
      return NextResponse.json({ error: "Demo talep bulunamadi" }, { status: 404 })
    }

    if (demoReq.payment_status === "paid") {
      return NextResponse.json({ error: "Bu demo zaten tam uyelige donusturulmus" }, { status: 400 })
    }

    // Demo → tam uyelik donusumu
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("demo_requests")
      .update({
        payment_status: "paid",
        payment_amount: payment_amount,
        payment_at: now,
        payment_notes: payment_notes || null,
        status: "donustu",
      })
      .eq("id", demo_request_id)

    if (updateError) {
      log.error("Demo conversion update error", new Error(updateError.message), { demo_request_id })
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Tenant package_type'i guncelle (demo → starter)
    if (demoReq.demo_user_id) {
      const { data: userTenant } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", demoReq.demo_user_id)
        .single()

      if (userTenant?.tenant_id) {
        const { error: tenantUpdateError } = await supabase
          .from("tenants")
          .update({ package_type: "starter", guncelleme_tarihi: now })
          .eq("id", userTenant.tenant_id)
        if (tenantUpdateError) {
          log.error("Failed to update tenant package_type during conversion", new Error(tenantUpdateError.message), { tenantId: userTenant.tenant_id, demo_request_id })
        }
      }
    }

    // Auth user metadata guncelle (demo → active)
    if (demoReq.demo_user_id) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(demoReq.demo_user_id, {
        user_metadata: { rol: "franchise_sahibi" },
      })
      if (authUpdateError) {
        log.error("Failed to update auth user metadata during conversion", new Error(authUpdateError.message), { userId: demoReq.demo_user_id, demo_request_id })
      }
    }

    log.info("Demo converted to full membership", {
      demo_request_id,
      payment_amount,
      user_id: demoReq.demo_user_id,
    })

    return NextResponse.json({
      success: true,
      demo_request_id,
      payment_amount,
      converted_at: now,
    })
  } catch (e) {
    log.error("Demo conversion API error", e instanceof Error ? e : new Error(String(e)))
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
