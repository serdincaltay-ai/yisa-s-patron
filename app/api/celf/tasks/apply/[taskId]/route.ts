import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

const FORBIDDEN_SQL = /\b(DROP|ALTER|TRUNCATE|DELETE|CREATE\s+TABLE)\b/i

const ALLOWED_JSON_TABLES = new Set(["celf_outputs", "celf_results", "celf_logs"])

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const { taskId } = await params
    if (!taskId) return NextResponse.json({ error: "taskId zorunlu" }, { status: 400 })

    const supabase = createAdminClient()

    const { data: task, error: taskErr } = await supabase
      .from("celf_tasks")
      .select("id, directorate, task_description, output_result, output_type, apply_status")
      .eq("id", taskId)
      .single()

    if (taskErr || !task) {
      return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
    }

    // Zaten uygulanmışsa tekrar uygulama (duplicate apply önleme)
    if (task.apply_status === "applied") {
      return NextResponse.json({ applied: true, output_type: (task.output_type as string) || "text", details: "Zaten uygulanmış" })
    }

    const outputType = (task.output_type as string) || "text"
    const outputResult = (task.output_result as Record<string, unknown>) || {}

    // ── Birincil işlem (sql/json) ──
    if (outputType === "sql") {
      const sql = (outputResult.sql as string) || ""
      if (FORBIDDEN_SQL.test(sql)) {
        await supabase
          .from("celf_tasks")
          .update({ apply_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", taskId)
        return NextResponse.json({
          applied: false,
          output_type: "sql",
          details: "Güvenlik: Sadece INSERT/UPDATE izin verilir. DROP/ALTER/TRUNCATE/DELETE/CREATE yasak.",
        })
      }
    } else if (outputType === "json") {
      const tableName = (outputResult.tableName as string) || "celf_outputs"
      if (!ALLOWED_JSON_TABLES.has(tableName)) {
        await supabase.from("celf_tasks").update({ apply_status: "failed", updated_at: new Date().toISOString() }).eq("id", taskId)
        return NextResponse.json({ applied: false, output_type: "json", details: `Guvenlik: Tablo izin listesinde degil: ${tableName}` })
      }
      const payload = outputResult.json ?? outputResult
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const { error: insertErr } = await supabase.from(tableName).insert(payload as Record<string, unknown>)
        if (insertErr) {
          await supabase.from("celf_tasks").update({ apply_status: "failed", updated_at: new Date().toISOString() }).eq("id", taskId)
          return NextResponse.json({ applied: false, output_type: "json", details: insertErr.message })
        }
      }
    }

    // ── apply_status = "applied" — birincil işlem başarılı, duplicate önleme ──
    await supabase
      .from("celf_tasks")
      .update({
        apply_status: "applied",
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    // ── Arşivleme (best-effort, hata loglanır ama ana işlemi engellemez) ──
    // ceo_templates: sadece template ve ui tipleri (DB CHECK: rapor/dashboard/ui/email/bildirim)
    if (outputType === "template" || outputType === "ui") {
      const { error: tplErr } = await supabase.from("ceo_templates").insert({
        template_name: (task.task_description as string) || "Şablon",
        template_type: outputType === "template" ? "rapor" : "ui",
        director_key: (task.directorate as string) || null,
        content: outputResult,
        variables: [],
        data_sources: [],
        is_approved: true,
        approved_by: null,
        approved_at: new Date().toISOString(),
      })
      if (tplErr) console.error("[apply] ceo_templates insert error:", tplErr.message)
    }

    // ceo_approved_tasks: tüm tipler arşivlenir
    const { error: archiveErr } = await supabase.from("ceo_approved_tasks").insert({
      task_id: taskId,
      task_type: outputType,
      director_key: (task.directorate as string) || "genel",
      original_command: (task.task_description as string) || "",
      final_result: outputResult,
      data_used: [],
      data_changed: [],
      approved_by: null,
      can_become_routine: true,
    })
    if (archiveErr) console.error("[apply] ceo_approved_tasks insert error:", archiveErr.message)

    return NextResponse.json({
      applied: true,
      output_type: outputType,
      details: "Uygulandı",
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
