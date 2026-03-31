import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * POST /api/celf/tasks/reject/[taskId]
 * Gorevi reddet ve sebebini kaydet
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const { taskId } = await params
    if (!taskId) return NextResponse.json({ error: "taskId zorunlu" }, { status: 400 })

    const body = await request.json()
    const rejectionReason = typeof body?.reason === "string" ? body.reason.trim() : ""

    if (!rejectionReason) {
      return NextResponse.json({ error: "Red sebebi zorunlu" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("celf_tasks")
      .update({
        status: "failed",
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      rejected: true,
      taskId,
      reason: rejectionReason,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
