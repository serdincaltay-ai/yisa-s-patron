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

    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + LEASE_MINUTES)

    const { data: updated, error } = await supabase
      .from("celf_tasks")
      .update({
        lease_expires_at: expires.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id)
      .eq("status", "locked")
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: "Task kilitli değil veya bulunamadı" }, { status: 404 })
    }

    return NextResponse.json({ lease_expires_at: expires.toISOString() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
