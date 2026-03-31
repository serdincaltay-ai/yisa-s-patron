import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/security/mfa — MFA durumunu sorgula
 * Supabase Auth'un built-in MFA desteğiyle birlikte kullanılacak.
 * Şu an: mfa_settings tablosundan kullanıcı ayarlarını döndürür.
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const url = new URL(request.url)
  const userId = url.searchParams.get("user_id") || ""

  if (!userId) {
    return NextResponse.json({ error: "user_id zorunlu" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("mfa_settings")
      .select("id, user_id, mfa_enabled, mfa_method, last_verified_at, updated_at")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      mfa_enabled: data?.mfa_enabled ?? false,
      mfa_method: data?.mfa_method ?? "totp",
      last_verified_at: data?.last_verified_at ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

/**
 * POST /api/security/mfa — MFA etkinleştir/devre dışı bırak
 * Gerçek TOTP enrollment Supabase Auth'un MFA API'si ile yapılır.
 * Bu endpoint sadece mfa_settings tablosunu günceller.
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const userId = typeof body?.user_id === "string" ? body.user_id : ""
    const mfaEnabled = typeof body?.mfa_enabled === "boolean" ? body.mfa_enabled : undefined
    const mfaMethod = typeof body?.mfa_method === "string" ? body.mfa_method : undefined

    if (!userId) {
      return NextResponse.json({ error: "user_id zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (mfaEnabled !== undefined) updateData.mfa_enabled = mfaEnabled
    if (mfaMethod) updateData.mfa_method = mfaMethod

    // Upsert — yoksa oluştur, varsa güncelle
    const { error } = await supabase
      .from("mfa_settings")
      .upsert(
        { user_id: userId, ...updateData },
        { onConflict: "user_id" }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...(mfaEnabled !== undefined ? { mfa_enabled: mfaEnabled } : {}),
      message: mfaEnabled === true ? "MFA etkinleştirildi" : mfaEnabled === false ? "MFA devre dışı bırakıldı" : "MFA ayarları güncellendi",
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
