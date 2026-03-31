import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { data: epics, error } = await supabase
      .from("celf_epics")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const withCounts = await Promise.all(
      (epics || []).map(async (e) => {
        const { count } = await supabase
          .from("celf_tasks")
          .select("id", { count: "exact", head: true })
          .eq("epic_id", e.id)
        return { ...e, task_count: count || 0 }
      })
    )

    return NextResponse.json(withCounts)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
