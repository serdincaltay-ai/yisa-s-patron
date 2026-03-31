import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * Görev 2: Supabase bağlantı doğrulama — tenants tablosuna erişim testi.
 * Sadece kontrol amaçlı; production'da kaldırılabilir veya korumaya alınabilir.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json(
      {
        success: false,
        error: "missing_env",
        message: "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil",
      },
      { status: 500 }
    )
  }

  if (url.startsWith("your_") || key.startsWith("your_")) {
    return NextResponse.json(
      {
        success: false,
        error: "placeholder_env",
        message: "Supabase değişkenleri hâlâ placeholder (your_...) — .env.local güncellenmeli",
      },
      { status: 500 }
    )
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("tenants").select("id").limit(5)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          connection: "error",
          message: error.message,
          code: error.code,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      connection: "ok",
      table: "tenants",
      rowCount: data?.length ?? 0,
      sampleIds: data?.map((r) => r.id) ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, connection: "exception", message },
      { status: 500 }
    )
  }
}
