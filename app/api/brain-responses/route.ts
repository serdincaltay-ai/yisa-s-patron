import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST: Beyin Takımı sohbet turunu brain_sessions + brain_responses olarak kaydet.
 * Body: { userMessage: string, mode: string, responses: { memberId: string, robotName?: string, content: string }[] }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    if (!patronSession) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userMessage, mode, responses } = body as {
      userMessage?: string
      mode?: string
      responses?: { memberId: string; robotName?: string; content: string }[]
    }

    if (!userMessage || !Array.isArray(responses)) {
      return NextResponse.json({ error: "userMessage ve responses gerekli" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: session, error: sessionError } = await supabase
      .from("brain_sessions")
      .insert({
        user_message: userMessage,
        mode: mode || "tekli",
      })
      .select("id")
      .single()

    if (sessionError || !session?.id) {
      return NextResponse.json(
        { error: sessionError?.message || "Oturum kaydedilemedi" },
        { status: 500 }
      )
    }

    if (responses.length > 0) {
      const rows = responses.map((r) => ({
        session_id: session.id,
        member_id: r.memberId,
        robot_name: r.robotName ?? null,
        content: r.content,
      }))
      const { error: respError } = await supabase.from("brain_responses").insert(rows)
      if (respError) {
        return NextResponse.json(
          { error: respError.message || "Yanıtlar kaydedilemedi" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, session_id: session.id })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hata" },
      { status: 500 }
    )
  }
}
