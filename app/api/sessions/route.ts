import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export const dynamic = "force-dynamic"

/**
 * CELF Session (Epic) listesi.
 * SessionList bileseninin beklediği formatta doner:
 * { items: SessionItem[] }
 *
 * celf_epics tablosundan patron komutlarini "session" olarak sunar.
 * Her epic bir CELF oturumunu temsil eder.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    // celf_epics — son 50 oturum
    const { data: epics, error: epicsErr } = await supabase
      .from("celf_epics")
      .select("id, patron_command, raw_command, status, total_tasks, completed_tasks, created_at, updated_at, completed_at, parsed_directorates, scope, created_by")
      .order("created_at", { ascending: false })
      .limit(50)

    if (epicsErr) {
      return NextResponse.json({ error: epicsErr.message }, { status: 500 })
    }

    // Her epic'i SessionItem formatina donustur
    const items = (epics ?? []).map((epic) => {
      const directorates = epic.parsed_directorates as string[] | null
      const dirCount = Array.isArray(directorates) ? directorates.length : 0

      // Status mapping: celf_epics status -> SessionItem status
      let sessionStatus: "active" | "completed" | "cancelled" = "active"
      const epicStatus = (epic.status as string) ?? ""
      if (epicStatus === "DONE" || epicStatus === "completed") {
        sessionStatus = "completed"
      } else if (epicStatus === "BLOCKED" || epicStatus === "failed" || epicStatus === "cancelled") {
        sessionStatus = "cancelled"
      }

      return {
        id: epic.id as string,
        tenant_name: (epic.scope as string) || "CELF Merkez",
        branch: dirCount > 0 ? (directorates as string[]).join(", ") : "Genel",
        coach_name: (epic.created_by as string) || "Patron",
        start_time: epic.created_at as string,
        end_time: (epic.completed_at as string) || (epic.updated_at as string) || null,
        athlete_count: (epic.total_tasks as number) || 0,
        status: sessionStatus,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
