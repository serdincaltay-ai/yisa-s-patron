import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendSms } from "@/lib/sms-provider"
import { SMS_TRIGGER_TYPES } from "@/lib/sms-triggers"
import { requirePatron } from "@/lib/celf/patron-auth"

type ReminderRow = {
  id: string
  amount: number | string | null
  category: string | null
  description: string | null
  next_due_date: string | null
  reminder_days_before: number | null
  vendor: string | null
  invoice_ref: string | null
}

function applyTemplate(template: string, row: ReminderRow, daysLeft: number) {
  const dueDate = row.next_due_date ?? "-"
  const amount = Number(row.amount) || 0
  const invoice = row.vendor || row.description || row.category || "Fatura"
  return template
    .replaceAll("{{fatura}}", invoice)
    .replaceAll("{{vade_tarihi}}", dueDate)
    .replaceAll("{{tutar}}", amount.toFixed(2))
    .replaceAll("{{kalan_gun}}", String(daysLeft))
    .replaceAll("{{kategori}}", row.category ?? "-")
    .replaceAll("{{ref}}", row.invoice_ref ?? "-")
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function diffDays(targetIso: string, now = new Date()) {
  const today = new Date(toIsoDate(now) + "T00:00:00.000Z")
  const target = new Date(targetIso + "T00:00:00.000Z")
  const ms = target.getTime() - today.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * GET /api/cron/fatura-reminder
 * Sabit gider kayıtlarından yaklaşan/geciken faturaları döner.
 * Opsiyonel: authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const patronOk = await requirePatron()
  if (!patronOk) {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const supabase = createAdminClient()
    const now = new Date()
    const maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + 15)

    const [{ data: templates }, { data: rows, error: rowsErr }] = await Promise.all([
      supabase
        .from("sms_templates")
        .select("key, body_tr")
        .eq("trigger_type", SMS_TRIGGER_TYPES.FATURA_HATIRLATMA)
        .eq("is_active", true),
      supabase
        .from("expenses")
        .select("id, amount, category, description, next_due_date, reminder_days_before, vendor, invoice_ref")
        .eq("is_fixed", true)
        .eq("is_active", true)
        .not("next_due_date", "is", null)
        .lte("next_due_date", toIsoDate(maxDate))
        .order("next_due_date", { ascending: true }),
    ])

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 })

    const tMap = new Map((templates ?? []).map((t) => [t.key, t.body_tr] as const))
    const upcomingTemplate = tMap.get("fatura_hatirlatma_yaklasan") ?? "YİSA-S: {{fatura}} ödemesi {{vade_tarihi}} tarihinde."
    const overdueTemplate = tMap.get("fatura_hatirlatma_geciken") ?? "YİSA-S: {{fatura}} ödemesi gecikmiş."

    const reminders = (rows ?? [])
      .map((row) => {
        const daysLeft = row.next_due_date ? diffDays(row.next_due_date, now) : 9999
        const reminderBefore = Math.max(0, row.reminder_days_before ?? 7)
        const isOverdue = daysLeft < 0
        const shouldReminder = isOverdue || daysLeft <= reminderBefore
        if (!shouldReminder) return null
        const message = isOverdue
          ? applyTemplate(overdueTemplate, row as ReminderRow, daysLeft)
          : applyTemplate(upcomingTemplate, row as ReminderRow, daysLeft)
        return {
          id: row.id,
          due_date: row.next_due_date,
          days_left: daysLeft,
          amount: Number(row.amount) || 0,
          category: row.category,
          vendor: row.vendor,
          invoice_ref: row.invoice_ref,
          status: isOverdue ? "overdue" : "upcoming",
          message,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ ok: true, count: reminders.length, reminders })
  } catch (e) {
    return NextResponse.json({ error: String(e), ok: false, count: 0, reminders: [] }, { status: 500 })
  }
}

/**
 * POST /api/cron/fatura-reminder
 * Dry-run veya tek numaraya test SMS.
 * Body: { phone?: string, dryRun?: boolean }
 */
export async function POST(request: Request) {
  const patronOk = await requirePatron()
  if (!patronOk) {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  let body: { phone?: string; dryRun?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // optional body
  }

  const summaryRes = await GET(request)
  const payload = await summaryRes.json().catch(() => ({ reminders: [] }))
  const reminders = (payload.reminders ?? []) as Array<{ message: string }>

  if (body.dryRun || !body.phone) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      count: reminders.length,
      sampleMessage: reminders[0]?.message ?? null,
    })
  }

  if (!reminders.length) {
    return NextResponse.json({ ok: true, sent: 0, message: "Gönderilecek reminder yok." })
  }

  const result = await sendSms(body.phone, reminders[0].message)
  return NextResponse.json({
    ok: result.success,
    sent: result.success ? 1 : 0,
    error: result.error,
  })
}
