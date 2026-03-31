import { NextResponse } from "next/server"
import { DIREKTORLUKLER } from "@/lib/direktorlukler/config"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/celf/directorates — Direktörlük listesi
 * Tüm 12 direktörlüğün kodu, adı, açıklaması ve renk bilgisini döner.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const directorates = DIREKTORLUKLER.map((d) => ({
    code: d.code,
    slug: d.slug,
    name: d.name,
    shortName: d.shortName,
    description: d.description,
    neonColor: d.neonColor,
  }))

  return NextResponse.json({ directorates })
}
