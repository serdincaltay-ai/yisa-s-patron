import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const { epicId } = await params
    if (!epicId) return NextResponse.json({ error: "epicId zorunlu" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: epic, error: epicErr } = await supabase
      .from("celf_epics")
      .select("id")
      .eq("id", epicId)
      .single()

    if (epicErr || !epic) {
      return NextResponse.json({ error: "Epic bulunamadı" }, { status: 404 })
    }

    await supabase
      .from("celf_epics")
      .update({
        approval_status: "approved",
        status: "done",
        updated_at: new Date().toISOString(),
      })
      .eq("id", epicId)

    await supabase
      .from("celf_tasks")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("epic_id", epicId)
      .in("status", ["queued", "running", "needs_review"])

    return NextResponse.json({ ok: true, epicId })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
