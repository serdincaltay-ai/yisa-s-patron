import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, ValidationError, AuthenticationError, NotFoundError } from "@/lib/errors"
import { log } from "@/lib/logger"
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug"
import { sendTenantWelcomeEmail } from "@/lib/emails/resend"
import type { DemoRequest, ApiResponse } from "@/lib/types"

/**
 * Demo talep güncelleme (authenticated - patron için: patron_session cookie veya Supabase user)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AuthenticationError("Authentication required")
    }

    // Status validation
    const validStatuses: DemoRequest["status"][] = ["yeni", "donustu", "iptal", "new", "gorusuldu", "onaylandi", "reddedildi"]
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(", ")}`)
    }

    // Mevcut demo_request'i çek
    const { data: demoRequest, error: fetchError } = await supabase
      .from("demo_requests")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !demoRequest) {
      throw new NotFoundError("Demo talep bulunamadı")
    }

    // Status geçiş koruması: onaylama/reddetme sadece yeni veya beklemede taleplerde yapılabilir
    const terminalActions = ["onaylandi", "converted", "reddedildi", "rejected"]
    const allowedCurrentStatuses = ["new", "yeni", "gorusuldu"]
    if (terminalActions.includes(status) && !allowedCurrentStatuses.includes(demoRequest.status)) {
      throw new ValidationError("Talep zaten işlenmiş")
    }

    // Onaylama durumunda duplicate email kontrolü
    if (status === "converted" || status === "onaylandi") {
      const email = (demoRequest.email ?? "").trim().toLowerCase()
      if (email) {
        const { data: existingByEmail } = await supabase
          .from("tenants")
          .select("id, ad")
          .ilike("email", email)
          .limit(1)
          .maybeSingle()
        if (existingByEmail) {
          throw new ValidationError("Bu e-posta adresiyle zaten bir tenant kayıtlı")
        }
      }
    }

    // Status güncelle
    const { data: updated, error: updateError } = await supabase
      .from("demo_requests")
      .update({ status })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      log.error("Demo request update error", new Error(updateError.message), { id })
      throw new Error("Demo talep güncellenemedi")
    }

    log.info("Demo request updated", { id, status })

    // Eğer status "onaylandi" ise tenant oluşturma sürecini başlat
    if (status === "donustu" || status === "onaylandi") {
      try {
        // Slug üret
        const baseSlug = generateSlug(demoRequest.name) || "tenant"

        // Slug benzersizliği kontrolü
        const checkSlugExists = async (slug: string): Promise<boolean> => {
          const { data } = await supabase.from("tenants").select("id").eq("slug", slug).single()
          return !!data
        }

        const uniqueSlug = await ensureUniqueSlug(baseSlug, checkSlugExists)

        // sim_updates tablosuna INSERT (CELF'e bildir)
        const { error: simError } = await supabase.from("sim_updates").insert({
          target_robot: "celf",
          target_direktorluk: "Operasyon",
          command: JSON.stringify({
            type: "tenant_kurulum",
            firma_adi: demoRequest.name,
            name: demoRequest.name,
            slug: uniqueSlug,
            email: demoRequest.email,
            sablon: null,
            paket: "STARTER",
          }),
          status: "new",
        })

        if (simError) {
          log.error("Sim update insert error", new Error(simError.message), { id, slug: uniqueSlug })
          // Hata olsa bile devam et, tenant oluşturma botu sim_updates'i kontrol edecek
        }

        log.info("Tenant kurulum tetiklendi", { id, slug: uniqueSlug })

        // Hoş geldin emaili gönder (async)
        sendTenantWelcomeEmail(demoRequest.email, demoRequest.name, uniqueSlug).catch((err) => {
          log.error("Failed to send welcome email", err)
        })

        return {
          success: true,
          status,
          slug: uniqueSlug,
        } as ApiResponse<{ success: boolean; status: string; slug: string }>
      } catch (error) {
        // Hata durumunda demo_request status'unu geri al (compensating transaction)
        await supabase
          .from("demo_requests")
          .update({ status: "new" })
          .eq("id", id)

        log.error("Tenant kurulum hatası, demo request geri alındı", error instanceof Error ? error : new Error(String(error)), { id })
        throw new Error("Tenant kurulumu başlatılamadı. Demo talebi beklemeye alındı.")
      }
    }

    return {
      success: true,
      status,
    } as ApiResponse<{ success: boolean; status: string }>
  })
}
