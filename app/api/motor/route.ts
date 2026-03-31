import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * GET: directorate_outputs listesi (directorate_slug query ile)
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("directorate_slug")
    if (!slug) {
      return NextResponse.json({ error: "directorate_slug gerekli" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("directorate_outputs")
      .select("id, command, output, status, created_at")
      .eq("directorate_slug", slug)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data: data ?? [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hata" },
      { status: 500 }
    )
  }
}

/**
 * POST: CELF motor — Patron komutu gönder, directorate_outputs'a yaz.
 * Body: { directorate_slug: string, command: string }
 * Patron session veya Supabase user gerekli.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
      }
    }

    const body = await request.json().catch(() => ({}))
    const { directorate_slug, command } = body as { directorate_slug?: string; command?: string }

    if (!directorate_slug || !command || typeof command !== "string") {
      return NextResponse.json(
        { error: "directorate_slug ve command zorunludur" },
        { status: 400 }
      )
    }

    const slug = String(directorate_slug).trim()
    const cmd = String(command).trim()
    if (!slug || !cmd) {
      return NextResponse.json(
        { error: "directorate_slug ve command boş olamaz" },
        { status: 400 }
      )
    }

    const { data: row, error } = await supabase
      .from("directorate_outputs")
      .insert({
        directorate_slug: slug,
        command: cmd,
        status: "beklemede",
      })
      .select("id, created_at")
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || "Kayıt oluşturulamadı" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: row?.id,
      created_at: row?.created_at,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hata" },
      { status: 500 }
    )
  }
}
