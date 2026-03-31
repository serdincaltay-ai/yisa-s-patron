import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * POST /api/celf/tasks/approve — Birleşik görev onay/red endpoint
 *
 * Hem v2 celf_tasks hem de eski v1 ceo_tasks tablosunu destekler.
 * Body: { task_id, approved: boolean }  (v2 format)
 *    veya { task_id, decision: 'approve' | 'reject' }  (v1 uyumluluk)
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { task_id } = body
    if (!task_id) return NextResponse.json({ error: "task_id zorunlu" }, { status: 400 })

    // v1 uyumluluk: decision → approved boolean'a dönüştür
    let approved: boolean
    if (typeof body.approved === "boolean") {
      approved = body.approved
    } else if (body.decision === "approve") {
      approved = true
    } else if (body.decision === "reject") {
      approved = false
    } else {
      return NextResponse.json({ error: "approved (boolean) veya decision ('approve'|'reject') zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Önce celf_tasks tablosunda ara (v2)
    const { data: celfTask } = await supabase
      .from("celf_tasks")
      .select("id")
      .eq("id", task_id)
      .single()

    if (celfTask) {
      const status = approved ? "completed" : "failed"
      const eventType = approved ? "APPROVED" : "REJECTED"

      await supabase
        .from("celf_tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", task_id)

      await supabase.from("celf_events").insert({
        task_id,
        event_type: eventType,
        meta: {},
      })

      return NextResponse.json({ success: true, task_id, status })
    }

    // celf_tasks'da bulunamazsa ceo_tasks'da ara (v1 uyumluluk)
    const { data: ceoTask } = await supabase
      .from("ceo_tasks")
      .select("id")
      .eq("id", task_id)
      .single()

    if (ceoTask) {
      if (approved) {
        await supabase
          .from("ceo_tasks")
          .update({ status: "DONE", approved_at: new Date().toISOString() })
          .eq("id", task_id)
        await supabase.from("celf_logs").update({ stage: "approved" }).eq("task_id", task_id)
      } else {
        await supabase.from("ceo_tasks").update({ status: "BLOCKED" }).eq("id", task_id)
      }

      return NextResponse.json({
        success: true,
        task_id,
        status: approved ? "DONE" : "BLOCKED",
      })
    }

    return NextResponse.json({ error: "Task bulunamadı" }, { status: 404 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
