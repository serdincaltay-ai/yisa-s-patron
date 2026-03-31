import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendSms } from "@/lib/sms-provider"
import { SMS_TRIGGER_TYPES } from "@/lib/sms-triggers"

/**
 * Aidat hatırlatma cron — yaklaşan/geciken aidat için SMS tetikler.
 * GET veya POST (Vercel cron secret ile korunabilir).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: templates } = await supabase
    .from("sms_templates")
    .select("id, key, body_tr, trigger_type")
    .eq("trigger_type", SMS_TRIGGER_TYPES.AIDAT_HATIRLATMA)
    .eq("is_active", true)

  if (!templates?.length) {
    return NextResponse.json({ ok: true, sent: 0, message: "Aidat şablonu yok" })
  }

  // Örnek: Yaklaşan/geciken aidat listesi (gerçekte aidat tablosundan gelir)
  // Burada sadece şablonları döndürüyoruz; gerçek veli/telefon verisi aidat/ödemeler tablosundan eklenir
  const sent: string[] = []
  for (const t of templates) {
    const body = t.body_tr || ""
    // Gerçek cron'da: aidat tablosundan telefon çekilip sendSms(phone, body) çağrılır
    // Şimdilik sadece yapı testi
    sent.push(t.key)
  }

  return NextResponse.json({ ok: true, sent: sent.length, templateKeys: sent })
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: templates } = await supabase
    .from("sms_templates")
    .select("id, key, body_tr, trigger_type")
    .eq("trigger_type", SMS_TRIGGER_TYPES.AIDAT_HATIRLATMA)
    .eq("is_active", true)

  if (!templates?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  type Body = { phone?: string; messageKey?: string }
  let body: Body = {}
  try {
    body = await request.json()
  } catch {
    // body optional
  }

  const phone = body.phone
  const messageKey = body.messageKey || "aidat_hatirlatma_yaklasan"
  const template = templates.find((t) => t.key === messageKey) || templates[0]
  const message = template.body_tr

  if (phone) {
    const result = await sendSms(phone, message)
    return NextResponse.json({ ok: result.success, sent: result.success ? 1 : 0, error: result.error })
  }

  return NextResponse.json({ ok: true, sent: 0, message: "phone verilmedi, sadece şablon kullanılabilir" })
}
