import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

interface GelirRow {
  ay: string
  gelir_tipi: string
  tutar: number
}

export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("v_patron_aylik_gelir")
      .select("*")
      .order("ay", { ascending: false })
      .limit(12)

    if (error) {
      console.error("[patron/finans] Supabase error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as GelirRow[]
    const toplam = rows.reduce((sum, row) => sum + (row.tutar ?? 0), 0)

    return NextResponse.json({ rows, toplam })
  } catch (e) {
    console.error("[patron/finans] Error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
