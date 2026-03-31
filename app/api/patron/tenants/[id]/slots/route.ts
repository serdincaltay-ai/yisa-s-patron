import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError, NotFoundError } from "@/lib/errors"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/patron/tenants/[id]/slots — Tenant slot listesi + template bilgisi
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")
    const supabase = createAdminClient()

    // Tenant bilgisi
    const { data: tenant, error: tErr } = await supabase
      .from("tenants")
      .select("id, ad, slug, durum")
      .eq("id", id)
      .single()

    if (tErr || !tenant) throw new NotFoundError("Tenant bulunamadi")

    // Template bilgisi
    const { data: templateLink } = await supabase
      .from("tenant_template_slots")
      .select("template_id")
      .eq("tenant_id", id)
      .limit(1)
      .maybeSingle()

    let template = null
    if (templateLink?.template_id) {
      const { data: tpl } = await supabase
        .from("system_templates")
        .select("id, template_key, name, description, tier, slot_count, active_slots")
        .eq("id", templateLink.template_id)
        .single()
      template = tpl
    }

    // Slot'lar
    const { data: slots } = await supabase
      .from("tenant_template_slots")
      .select("*")
      .eq("tenant_id", id)
      .order("slot_code")

    return NextResponse.json({
      tenant,
      template,
      slots: slots ?? [],
    })
  })
}

/**
 * PUT /api/patron/tenants/[id]/slots — Slot icerik guncelleme (patron tarafindan)
 * Body: { slot_code: string, content: object, is_active?: boolean }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")

    const body = await request.json()
    const { slot_code, content, is_active } = body

    if (!slot_code || typeof slot_code !== "string") {
      return NextResponse.json({ error: "slot_code zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updatePayload: Record<string, unknown> = {}
    if (content !== undefined) updatePayload.content = content
    if (is_active !== undefined) updatePayload.is_active = is_active
    updatePayload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("tenant_template_slots")
      .update(updatePayload)
      .eq("tenant_id", id)
      .eq("slot_code", slot_code)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, slot: data })
  })
}
