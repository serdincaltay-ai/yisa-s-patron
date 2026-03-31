import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withErrorHandling, AuthenticationError, ValidationError } from "@/lib/errors"
import { requirePatron } from "@/lib/celf/patron-auth"

function mapDbStatusToKanban(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "BACKLOG"
    case "assigned":
      return "READY"
    case "awaiting_approval":
      return "REVIEW"
    case "completed":
      return "DONE"
    case "cancelled":
      return "BLOCKED"
    default:
      return status ?? "BACKLOG"
  }
}

/**
 * GET: ceo_tasks listesi (Kanban için)
 */
export async function GET() {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("ceo_tasks")
      .select("id, title, description, task_description, task_type, director_key, scope, priority, status, approved_at, approved_by, created_at")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    const normalized = (data ?? []).map((task) => ({
      id: task.id,
      input: JSON.stringify({
        title: (task.title as string | null) || (task.task_description as string | null) || "—",
        description: (task.description as string | null) || "",
      }),
      task_type: (task.task_type as string | null) ?? "manual",
      target_robot: (task.director_key as string | null) ?? "celf",
      scope: (task.scope as string | null) ?? "global",
      priority: Number(task.priority) || 1,
      status: mapDbStatusToKanban(task.status as string | null),
      approved_at: (task.approved_at as string | null) ?? null,
      approved_by: (task.approved_by as string | null) ?? null,
      created_at: (task.created_at as string | null) ?? null,
    }))
    return NextResponse.json({ data: normalized })
  })
}

/**
 * POST: Yeni görev (status: BACKLOG)
 * Body: { title, description?, scope: 'global'|'tenant', tenant_id?, priority: 1-5 }
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")
    const body = await request.json().catch(() => ({}))
    const { title, description, scope, tenant_id: _tenantId, priority } = body
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new ValidationError("title zorunludur")
    }
    if (scope !== "global" && scope !== "tenant") {
      throw new ValidationError("scope 'global' veya 'tenant' olmalı")
    }
    const pr = typeof priority === "number" ? Math.max(1, Math.min(5, priority)) : 1
    const cleanTitle = title.trim()
    const cleanDescription = description?.trim() || ""
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("ceo_tasks")
      .insert({
        title: cleanTitle,
        description: cleanDescription || null,
        task_description: cleanDescription ? `${cleanTitle} — ${cleanDescription}` : cleanTitle,
        task_type: "manual",
        director_key: "CSO",
        scope: scope,
        priority: pr,
        status: "pending",
      })
      .select("id, status, created_at")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ id: data?.id, status: data?.status })
  })
}
