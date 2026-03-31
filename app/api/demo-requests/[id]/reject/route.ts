import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError, NotFoundError } from "@/lib/errors"
import { log } from "@/lib/logger"

/**
 * POST: Demo talebini reddet.
 * Body: { reason?: string } (opsiyonel red nedeni)
 * Patron session cookie veya Supabase user gerekli.
 */
export async function POST(
  request: Request,
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
      .select("id, status")
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

    let reason: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      reason = typeof body.reason === "string" ? body.reason.trim() || null : null
    } catch {
      // body yoksa devam et
    }

    const updatePayload: { status: string; rejection_reason?: string } = {
      status: "rejected",
    }
    if (reason) updatePayload.rejection_reason = reason

    const { error: updateError } = await supabase
      .from("demo_requests")
      .update(updatePayload)
      .eq("id", id)

    if (updateError) {
      log.error("Demo request reject update error", new Error(updateError.message), { id })
      throw new Error("Red işlemi kaydedilemedi")
    }

    log.info("Demo request rejected", { id, hasReason: !!reason })
    return NextResponse.json({ success: true, status: "rejected" })
  })
}
