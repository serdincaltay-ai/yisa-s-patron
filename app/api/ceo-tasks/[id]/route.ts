import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { withErrorHandling, AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors"

const ALLOWED_STATUS = ["BACKLOG", "READY", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"] as const

const DB_STATUS_BY_KANBAN: Record<string, string> = {
  BACKLOG: "pending",
  READY: "assigned",
  IN_PROGRESS: "assigned",
  REVIEW: "awaiting_approval",
  DONE: "completed",
  BLOCKED: "cancelled",
}

/**
 * PATCH: Görev status güncelle
 * Body: { status }
 */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id } = await params
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")
    const body = await _request.json().catch(() => ({}))
    const status = body?.status
    if (!status || (typeof status !== "string")) {
      throw new ValidationError("status geçerli değil")
    }
    const normalized = DB_STATUS_BY_KANBAN[status] ?? status
    const acceptedDbStatuses = new Set(["pending", "assigned", "awaiting_approval", "completed", "cancelled"])
    const isKanbanStatus = (ALLOWED_STATUS as readonly string[]).includes(status)
    if (!isKanbanStatus && !acceptedDbStatuses.has(normalized)) {
      throw new ValidationError("status geçerli değil")
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("ceo_tasks")
      .update({ status: normalized })
      .eq("id", id)
      .select("id, status")
      .single()
    if (error) throw new Error(error.message)
    if (!data) throw new NotFoundError("Görev bulunamadı")
    return NextResponse.json({ id: data.id, status: data.status })
  })
}
