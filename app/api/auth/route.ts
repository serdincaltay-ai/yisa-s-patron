/**
 * Patron giriş API.
 * - Oturum: 4 saat (maxAge). MFA akışında session /api/auth/mfa set-patron-session ile ayarlanır.
 * - 5 başarısız deneme → 30 dk IP kilit, security_logs (severity: turuncu) — patron_login_attempts tablosu.
 * - Farklı IP girişi → Patron'a Resend ile e-posta (patron_known_ip cookie).
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Eski şifre bazlı giriş devre dışı — MFA zorunlu akış kullanılmalı (/auth/login)
// Patron session cookie artık sadece /api/auth/mfa set-patron-session action ile ayarlanır
export async function POST() {
  return NextResponse.json(
    { error: "Bu endpoint kullanım dışı. /auth/login üzerinden MFA ile giriş yapın." },
    { status: 410 }
  )
}

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get("patron_session")
  return NextResponse.json({ authenticated: session?.value === "authenticated" })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete("patron_session")
  cookieStore.delete("patron_known_ip")
  return NextResponse.json({ success: true })
}
