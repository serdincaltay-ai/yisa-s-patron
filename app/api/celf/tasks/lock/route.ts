import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

const LEASE_MINUTES = 10

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = await request.json()
    const { task_id } = body
    if (!task_id) return NextResponse.json({ error: "task_id zorunlu" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: task } = await supabase
      .from("celf_tasks")
      .select("id, status, lease_expires_at")
      .eq("id", task_id)
      .single()

    if (!task) return NextResponse.json({ error: "Task bulunamadı" }, { status: 404 })
    if (task.status === "locked" && task.lease_expires_at) {
      const exp = new Date(task.lease_expires_at)
      if (exp > new Date()) {
        return NextResponse.json({ error: "Task zaten kilitli" }, { status: 409 })
      }
    }

    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + LEASE_MINUTES)

    const { data: updated, error } = await supabase
      .from("celf_tasks")
      .update({
        status: "locked",
        lock_owner_user_id: null,
        locked_at: new Date().toISOString(),
        lease_expires_at: expires.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from("celf_events").insert({
      task_id,
      event_type: "LOCK_ACQUIRED",
      meta: { lease_expires: expires.toISOString() },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
