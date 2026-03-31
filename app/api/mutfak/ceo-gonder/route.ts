/**
 * POST /api/mutfak/ceo-gonder
 * Mutfak Panel — Patron komutunu CEO (CELF) pipeline'a gonderir.
 * Mevcut /api/celf/tasks/command akisini kullanir.
 * Body: { command: string, directorate_hint?: string, confirmed?: boolean }
 * Response: proxy to /api/celf/tasks/command
 */

import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const command = typeof body.command === "string" ? body.command.trim() : ""
    if (!command) {
      return NextResponse.json({ error: "command zorunlu" }, { status: 400 })
    }

    const directorate_hint = typeof body.directorate_hint === "string" ? body.directorate_hint.trim() : undefined
    const confirmed = body.confirmed !== false

    // Forward to CELF command pipeline via internal fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:3000`

    const celfRes = await fetch(`${baseUrl}/api/celf/tasks/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        command,
        directorate_hint,
        confirmed,
        auto_execute: true,
      }),
    })

    const celfData = await celfRes.json()

    // Log the command for audit
    try {
      const supabase = createAdminClient()
      await supabase.from("celf_epics").insert({
        title: `CEO Gonder: ${command.slice(0, 60)}`,
        raw_command: command,
        patron_command: command,
        status: "done",
      }).then(() => {})
    } catch (dbErr) {
      console.error("[mutfak/ceo-gonder] audit log error:", dbErr)
    }

    return NextResponse.json(celfData, { status: celfRes.status })
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    console.error("[mutfak/ceo-gonder] Error:", err)
    return NextResponse.json({ error: "CEO gonder hatasi", detail: err }, { status: 500 })
  }
}
