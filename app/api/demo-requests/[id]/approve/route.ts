import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError, NotFoundError } from "@/lib/errors"
import { log } from "@/lib/logger"
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug"
import { sendDemoApprovedEmail } from "@/lib/emails/resend"
import { insertTenantWithFallback } from "@/lib/supabase/tenant-insert"

/**
 * POST: Demo talebini onayla + tenants tablosuna kayıt oluştur + Supabase Auth kullanıcı oluştur.
 * GOREV #14: Telefon = Kullanıcı Adı, Son 4 Hane = Şifre Otomasyonu
 *
 * Akış:
 * 1. Demo request status → "converted"
 * 2. Tenant kaydı oluştur
 * 3. Supabase Auth kullanıcı oluştur (phone → username, son 4 hane → şifre)
 * 4. user_tenants kaydı oluştur
 * 5. demo_requests tablosunu demo_user_id, demo_expires_at ile güncelle
 * 6. Email ile bilgilendirme gönder
 *
 * Hata durumunda demo_requests status geri 'new' yapılır (rollback).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AuthenticationError("Authentication required")
    }

    const { data: demoRequest, error: fetchError } = await supabase
      .from("demo_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !demoRequest) {
      throw new NotFoundError("Demo talep bulunamadı")
    }

    if (demoRequest.status !== "new") {
      return NextResponse.json(
        { success: false, error: { message: "Talep zaten işlenmiş", statusCode: 400 } },
        { status: 400 }
      )
    }

    const firmaAdi = demoRequest.name ?? ""
    const phone = (demoRequest.phone ?? "").replace(/\s/g, "")
    const email = (demoRequest.email ?? "").trim()

    // Telefon numarasından kullanıcı adı ve şifre üret
    const cleanDigits = phone.replace(/\D/g, "")
    // Son 10 hane (5XX XXX XX XX) — başındaki 0 veya +90 temizle
    const phoneDigits = cleanDigits.startsWith("90") && cleanDigits.length === 12
      ? cleanDigits.slice(2)
      : cleanDigits.startsWith("0") && cleanDigits.length === 11
        ? cleanDigits.slice(1)
        : cleanDigits
    // Telefon numarası doğrulama — en az 10 hane olmalı
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { success: false, error: { message: "Geçerli bir telefon numarası gerekli (en az 10 hane)", statusCode: 400 } },
        { status: 400 }
      )
    }
    const demoUsername = phoneDigits // örn: 5321234567
    const demoPassword = phoneDigits.slice(-4) // SSOT: son 4 hane = şifre (örn: 4567)
    // Auth email: telefon@demo.yisa-s.com (unique identifier for Supabase Auth)
    const authEmail = `${demoUsername}@demo.yisa-s.com`

    // Slug üret
    const baseSlug = generateSlug(firmaAdi) || "tenant"
    const checkSlugExists = async (slug: string): Promise<boolean> => {
      const { data } = await supabase.from("tenants").select("id").eq("slug", slug).single()
      return !!data
    }
    const uniqueSlug = await ensureUniqueSlug(baseSlug, checkSlugExists)

    // Demo süresi: 30 gün
    const now = new Date()
    const demoExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // Admin client ile auth işlemleri (service role gerekli)
    const adminClient = createAdminClient()

    // 1. Demo request status güncelle
    const { error: updateDemoError } = await supabase
      .from("demo_requests")
      .update({ status: "converted" })
      .eq("id", id)

    if (updateDemoError) {
      log.error("Demo request approve update error", new Error(updateDemoError.message), { id })
      throw new Error("Demo talebi güncellenemedi")
    }

    // 2. Tenant oluştur (name/ad şema farkına dayanıklı)
    const { data: tenant, error: tenantError } = await insertTenantWithFallback(supabase, {
      tenantName: firmaAdi,
      slug: uniqueSlug,
      email: email || null,
      phone: phone || null,
      ownerName: demoRequest.name || null,
      packageType: "demo",
      status: "aktif",
      setupCompleted: false,
      tokenBalance: 0,
      updatedAt: now.toISOString(),
    })

    if (tenantError || !tenant) {
      log.error("Tenant insert error, rolling back demo_request", new Error(tenantError?.message || "Unknown tenant insert error"), { id, slug: uniqueSlug })
      await supabase
        .from("demo_requests")
        .update({ status: "new" })
        .eq("id", id)
      throw new Error(tenantError?.message || "Tenant oluşturulamadı. Talep beklemeye alındı.")
    }
    const tenantId = String(tenant.id ?? "")
    if (!tenantId) {
      await supabase.from("demo_requests").update({ status: "new" }).eq("id", id)
      throw new Error("Tenant ID alınamadı. Talep beklemeye alındı.")
    }

    // 3. Supabase Auth kullanıcı oluştur
    let demoUserId: string | null = null
    let authFailureMessage: string | null = null
    try {
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          firma_adi: firmaAdi,
          yetkili_adi: demoRequest.name,
          phone: phone,
          real_email: email,
          rol: "demo",
          demo_expires_at: demoExpiresAt,
          tenant_slug: uniqueSlug,
        },
      })

      if (authError) {
        authFailureMessage = authError.message
        log.error("Auth user creation error", new Error(authError.message), { id, authEmail })
      } else if (authUser?.user) {
        demoUserId = authUser.user.id
        log.info("Demo auth user created", { userId: demoUserId, authEmail })
      }
    } catch (authErr) {
      authFailureMessage = authErr instanceof Error ? authErr.message : String(authErr)
      log.error("Auth user creation exception", authErr instanceof Error ? authErr : new Error(String(authErr)), { id })
    }

    // Auth user oluşturulamadıysa tenant ve demo_request'i rollback yap
    if (!demoUserId) {
      log.error("Auth user creation failed, rolling back tenant and demo_request", new Error(authFailureMessage || "Unknown auth error"), {
        id,
        tenantId,
        authEmail,
      })
      await supabase.from("tenants").delete().eq("id", tenantId)
      await supabase.from("demo_requests").update({ status: "new" }).eq("id", id)
      throw new Error(authFailureMessage || "Kullanıcı hesabı oluşturulamadı. Talep beklemeye alındı.")
    }

    // 4. user_tenants kaydı oluştur (auth try/catch dışında — throw doğrudan propagate olur)
    const { error: utError } = await adminClient
      .from("user_tenants")
      .insert({
        user_id: demoUserId,
        tenant_id: tenantId,
        role: "owner",
      })

    if (utError) {
      log.error("user_tenants insert error, rolling back auth user + tenant + demo_request", new Error(utError.message), {
        userId: demoUserId,
        tenantId,
      })
      await adminClient.auth.admin.deleteUser(demoUserId)
      await supabase.from("tenants").delete().eq("id", tenantId)
      await supabase.from("demo_requests").update({ status: "new" }).eq("id", id)
      throw new Error(utError.message || "Kullanıcı-tenant bağlantısı oluşturulamadı. Talep beklemeye alındı.")
    }

    // 5. demo_requests tablosunu demo bilgileriyle güncelle
    const { error: demoUpdateError } = await supabase
      .from("demo_requests")
      .update({
        demo_user_id: demoUserId,
        demo_expires_at: demoExpiresAt,
        demo_started_at: now.toISOString(),
      })
      .eq("id", id)

    if (demoUpdateError) {
      log.error("Failed to update demo_requests with demo info", new Error(demoUpdateError.message), { id, demoUserId })
    }

    // 6. Email ile bilgilendirme gönder
    const subdomain = `${uniqueSlug}.yisa-s.com`
    if (email) {
      sendDemoApprovedEmail(email, firmaAdi, uniqueSlug, demoUsername, demoPassword, demoExpiresAt).catch((err) => {
        log.error("Failed to send demo approved email", err)
      })
    }

    // SMS hook noktası — ileride SMS entegrasyonu eklenecek
    // sendDemoCredentialsSms(phone, demoUsername, demoPassword, subdomain)

    log.info("Demo approved: tenant + auth user created", {
      id,
      tenant_id: tenantId,
      slug: uniqueSlug,
      demo_user_id: demoUserId,
      demo_expires_at: demoExpiresAt,
    })

    return NextResponse.json({
      success: true,
      slug: uniqueSlug,
      subdomain,
      tenant_id: tenantId,
      demo_user_id: demoUserId,
      credentials: {
        username: demoUsername,
        temp_password: demoPassword,
        auth_email: authEmail,
        expires_at: demoExpiresAt,
      },
    })
  })
}
