import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { headers } from "next/headers"
import { getLockdownConfig } from "@/lib/security/lockdown-level"

/**
 * POST /api/auth/mfa — MFA işlemleri
 * action: "check-ip" | "log-attempt" | "notify-different-ip"
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = body.action as string

    const headersList = await headers()
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown"
    const device = headersList.get("user-agent") || "unknown"

    const admin = createAdminClient()

    // ── IP bazlı kilit kontrolü ──
    if (action === "check-ip") {
      const lock = await getLockdownConfig(admin)
      const windowStart = new Date(Date.now() - lock.windowMinutes * 60 * 1000).toISOString()

      const { data: failedAttempts } = await admin
        .from("security_logs")
        .select("id")
        .eq("ip_address", ip)
        .eq("success", false)
        .eq("event_type", "login_attempt")
        .gte("created_at", windowStart)

      const failCount = failedAttempts?.length ?? 0

      if (failCount >= lock.maxFailedAttempts) {
        return NextResponse.json({
          locked: true,
          level: lock.level,
          message: `Cok fazla basarisiz deneme. ${lock.blockMinutes} dakika bekleyin.`,
          remainingAttempts: 0,
        })
      }

      return NextResponse.json({
        locked: false,
        level: lock.level,
        remainingAttempts: lock.maxFailedAttempts - failCount,
      })
    }

    // ── Giriş denemesi logla ──
    if (action === "log-attempt") {
      const success = body.success as boolean
      const userId = body.userId as string | undefined
      const email = body.email as string | undefined

      // Rate limit: ayni IP'den son 5 saniyede log-attempt varsa reddet (DoS onlemi)
      const fiveSecAgo = new Date(Date.now() - 5 * 1000).toISOString()
      const { data: recentLogs } = await admin
        .from("security_logs")
        .select("id")
        .eq("ip_address", ip)
        .eq("event_type", "login_attempt")
        .gte("created_at", fiveSecAgo)

      if ((recentLogs?.length ?? 0) >= 2) {
        return NextResponse.json({ error: "Cok hizli deneme" }, { status: 429 })
      }

      await admin.from("security_logs").insert({
        event_type: "login_attempt",
        severity: success ? "bilgi" : "uyari",
        description: success
          ? `Basarili giris: ${email || "unknown"}`
          : `Basarisiz giris denemesi: ${email || "unknown"}`,
        ip_address: ip,
        device,
        success,
        user_id: userId || null,
        blocked: false,
      })

      return NextResponse.json({ logged: true })
    }

    // ── Farkli IP bildirimi ──
    if (action === "notify-different-ip") {
      const userId = body.userId as string
      const email = body.email as string

      // Son basarili girisi bul
      const { data: lastLogin } = await admin
        .from("security_logs")
        .select("ip_address")
        .eq("user_id", userId)
        .eq("success", true)
        .eq("event_type", "login_attempt")
        .order("created_at", { ascending: false })
        .limit(2)

      const previousIp = lastLogin?.[1]?.ip_address
      if (previousIp && previousIp !== ip) {
        // Farkli IP tespit edildi — log kaydi olustur
        await admin.from("security_logs").insert({
          event_type: "different_ip_login",
          severity: "uyari",
          description: `Farkli IP'den giris: ${email}. Onceki: ${previousIp}, Yeni: ${ip}`,
          ip_address: ip,
          device,
          success: true,
          user_id: userId,
          blocked: false,
        })

        // Push/email bildirimi placeholder — Supabase Edge Function ile entegre edilecek
        // Simdilik log ile kayit altina aliniyor
        return NextResponse.json({ differentIp: true })
      }

      return NextResponse.json({ differentIp: false })
    }

    // ── Patron session cookie ayarla (server-side, sifre gerektirmez) ──
    if (action === "set-patron-session") {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: "Oturum bulunamadi" }, { status: 401 })
      }

      // AAL2 kontrolu — MFA dogrulama tamamlanmis olmali
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalData?.currentLevel !== "aal2") {
        return NextResponse.json({ error: "MFA dogrulama gerekli" }, { status: 403 })
      }

      // Rolu kontrol et (user_tenants tablosundan)
      const { data: userTenant } = await admin
        .from("user_tenants")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (userTenant?.role !== "patron") {
        return NextResponse.json({ error: "Sadece patron icin" }, { status: 403 })
      }

      // Cookie ayarla (4 saat)
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      cookieStore.set("patron_session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 4, // 4 saat
        path: "/",
      })

      return NextResponse.json({ success: true })
    }

    // ── MFA enrollment durumu kontrol ──
    if (action === "check-mfa") {
      const supabase = await createClient()
      const { data: factors } = await supabase.auth.mfa.listFactors()

      const totpFactors = factors?.totp ?? []
      const hasVerifiedFactor = totpFactors.some(
        (f) => f.status === "verified"
      )

      return NextResponse.json({
        enrolled: hasVerifiedFactor,
        factorCount: totpFactors.length,
      })
    }

    return NextResponse.json({ error: "Gecersiz action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
