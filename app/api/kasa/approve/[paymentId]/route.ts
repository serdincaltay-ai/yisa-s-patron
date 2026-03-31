import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { logAction } from "@/lib/audit"

/**
 * POST: Ödeme onayı (kasa). paymentId ile ilgili kaydı onaylı yapar.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const { paymentId } = await params
  if (!paymentId) return NextResponse.json({ error: "paymentId zorunlu" }, { status: 400 })

  const supabase = createAdminClient()

  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select("id, amount, status, tenant_id")
    .eq("id", paymentId)
    .single()

  if (fetchErr || !payment) {
    return NextResponse.json({ error: "Ödeme bulunamadı" }, { status: 404 })
  }

  const { error: updateErr } = await supabase
    .from("payments")
    .update({ status: "onaylandi" })
    .eq("id", paymentId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  await logAction("payment_approve", "payment", paymentId, {
    amount: payment.amount,
    tenant_id: payment.tenant_id,
  })

  return NextResponse.json({ success: true, paymentId, status: "onaylandi" })
}
