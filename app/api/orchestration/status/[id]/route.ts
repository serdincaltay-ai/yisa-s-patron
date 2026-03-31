import { NextResponse } from "next/server"
import { getExecution } from "@/lib/orchestration"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET /api/orchestration/status/:id
 * Bir orkestrasyon zincirinin anlık durumunu döner.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const { id } = await params

    if (!id?.trim()) {
      return NextResponse.json(
        { error: "execution_id gerekli" },
        { status: 400 }
      )
    }

    const execution = getExecution(id)

    if (!execution) {
      return NextResponse.json(
        { error: "Çalıştırma bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(execution)
  } catch (err) {
    console.error("[Orchestration Status]", err)
    return NextResponse.json(
      { error: "Durum sorgulanamadı" },
      { status: 500 }
    )
  }
}
