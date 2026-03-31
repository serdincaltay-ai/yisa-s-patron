import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withErrorHandling, ValidationError, AuthenticationError } from "@/lib/errors"
import { log } from "@/lib/logger"
import { generateSlug, isValidSlug } from "@/lib/utils/slug"
import { insertTenantWithFallback } from "@/lib/supabase/tenant-insert"
import type { Tenant, ApiResponse, PaginatedResponse } from "@/lib/types"

/**
 * Tenant oluşturma (authenticated - patron için)
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    // Authenticated user kontrolü
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthenticationError("Authentication required")
    }

    const body = await request.json()
    const { firma_adi, slug, email, yetkili_adi, sablon, paket } = body

    // Zorunlu alan kontrolü
    if (!firma_adi || !slug || !email) {
      throw new ValidationError("firma_adi, slug ve email zorunludur")
    }

    // Slug validasyonu
    if (!isValidSlug(slug)) {
      throw new ValidationError("Slug sadece [a-z0-9-] karakterlerini içermeli ve 2-50 karakter arası olmalıdır")
    }

    // Slug benzersizlik kontrolü
    const { data: existingTenant } = await supabase.from("tenants").select("id").eq("slug", slug).single()
    if (existingTenant) {
      throw new ValidationError("Bu slug zaten kullanılıyor")
    }

    // Tenant oluştur
    const { data: tenant, error: tenantError } = await insertTenantWithFallback(supabase, {
      tenantName: firma_adi,
      slug,
      email,
      phone: body.phone || null,
      ownerName: yetkili_adi || null,
      packageType: paket?.toLowerCase() || "starter",
      status: "aktif",
      setupCompleted: false,
      tokenBalance: 0,
      updatedAt: new Date().toISOString(),
    })

    if (tenantError || !tenant) {
      log.error("Tenant insert error", new Error(tenantError?.message || "Unknown tenant insert error"), { slug, firma_adi })
      throw new Error("Tenant oluşturulamadı")
    }

    const tenantId = String(tenant.id ?? "")
    if (!tenantId) {
      throw new Error("Tenant ID alınamadı")
    }

    log.info("Tenant created", { tenant_id: tenantId, slug, firma_adi })

    // Otomatik şablon kayıtlar

    // 1. user_tenants: tenant_id + owner email, role: "admin"
    const { error: userTenantError } = await supabase.from("user_tenants").insert({
      user_id: user.id,
      tenant_id: tenantId,
      role: "admin",
    })

    if (userTenantError) {
      log.error("User tenant insert error", new Error(userTenantError.message), { tenant_id: tenantId })
      // Hata olsa bile devam et
    }

    // 2. groups: 3 varsayılan grup INSERT
    const defaultGroups = [
      { name: "Minikler", yas_baslangic: 4, yas_bitis: 7, max_ogrenci: 15 },
      { name: "Yıldızlar", yas_baslangic: 8, yas_bitis: 12, max_ogrenci: 20 },
      { name: "Gençler", yas_baslangic: 13, yas_bitis: 17, max_ogrenci: 20 },
    ]

    const groupsToInsert = defaultGroups.map((group) => ({
      tenant_id: tenantId,
      name: group.name,
      yas_baslangic: group.yas_baslangic,
      yas_bitis: group.yas_bitis,
      max_ogrenci: group.max_ogrenci,
    }))

    const { error: groupsError } = await supabase.from("groups").insert(groupsToInsert)

    if (groupsError) {
      log.error("Groups insert error", new Error(groupsError.message), { tenant_id: tenantId })
      // Hata olsa bile devam et
    }

    // 3. audit_log'a INSERT
    const { error: auditError } = await supabase.from("audit_log").insert({
      event_type: "tenant_created",
      actor_id: user.id,
      actor_email: user.email,
      tenant_id: tenantId,
      target_table: "tenants",
      target_id: tenantId,
      details: { slug, firma_adi },
      severity: "info",
    })

    if (auditError) {
      log.error("Audit log insert error", new Error(auditError.message))
      // Hata olsa bile devam et
    }

    return {
      success: true,
      tenant_id: tenantId,
      subdomain: `${slug}.yisa-s.com`,
    } as ApiResponse<{ success: boolean; tenant_id: string; subdomain: string }>
  })
}

/**
 * Tenant listesi (authenticated - patron için)
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    // Authenticated user kontrolü
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthenticationError("Authentication required")
    }

    // Query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Query builder
    let query = supabase.from("tenants").select("*", { count: "exact" })

    // Status filtresi (DB column is 'durum', not 'status')
    if (status) {
      query = query.eq("durum", status)
    }

    // Sıralama ve pagination (DB column is 'olusturma_tarihi', not 'created_at')
    query = query.order("olusturma_tarihi", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      log.error("Tenants fetch error", new Error(error.message))
      throw new Error("Tenant'lar getirilemedi")
    }

    return {
      data: data || [],
      count: count || 0,
    } as PaginatedResponse<Tenant>
  })
}
