import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_MODELS = ["claude", "gpt", "gemini"] as const

/**
 * GET: Görev geçmişi (brain_tasks), en son 50 kayıt
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("brain_tasks")
      .select("id, model, prompt, response, status, created_at")
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
 * POST: Mock görev — gerçek API çağrısı yok, yanıt Supabase'e kaydedilir
 * Body: { model: "claude"|"gpt"|"gemini", prompt: string, context?: string }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const model = typeof body.model === "string" ? body.model.toLowerCase() : ""
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
    const context = typeof body.context === "string" ? body.context.trim() : ""

    if (!prompt) {
      return NextResponse.json({ error: "prompt zorunludur" }, { status: 400 })
    }
    const modelKey = ALLOWED_MODELS.includes(model as (typeof ALLOWED_MODELS)[number])
      ? model
      : "claude"

    const mockResponse = `Beyin Takımı aktif. Model: ${modelKey}. Görev alındı.${context ? `\n\nBağlam: ${context.slice(0, 200)}` : ""}`

    const { data: row, error } = await supabase
      .from("brain_tasks")
      .insert({
        model: modelKey,
        prompt,
        response: mockResponse,
        status: "completed",
        created_by: "patron",
      })
      .select("id, model, response, status, created_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      model: row?.model,
      response: row?.response,
      status: row?.status,
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
