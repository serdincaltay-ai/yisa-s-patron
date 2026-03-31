import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * POST: { action: 'decide', approve: true, id: string }
 * Patron onayı — demo talebini onayla, tenant oluştur, Resend ile franchise yetkilisine e-posta.
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  let body: { action?: string; approve?: boolean; id?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Geçerli JSON gerekli" }, { status: 400 })
  }
  if (body.action !== "decide" || body.approve !== true || !body.id || typeof body.id !== "string") {
    return NextResponse.json(
      { error: "Body: action:'decide', approve:true, id (UUID) zorunlu" },
      { status: 400 }
    )
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const url = `${base}/api/demo-requests/${encodeURIComponent(body.id)}/approve`
  const cookie = request.headers.get("cookie") || ""
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
