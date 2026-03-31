/**
 * YİSA-S Audit log — hassas işlemleri audit_log tablosuna yazar
 */

import { createAdminClient } from "@/lib/supabase/admin"

export type AuditResourceType =
  | "demo_request"
  | "payment"
  | "task"
  | "epic"
  | "tenant"
  | "user"
  | "expense"
  | "approval"
  | string

/**
 * Bir aksiyonu audit_log tablosuna ekler.
 * user_id opsiyonel (cookie/session’dan gelebilir).
 */
export async function logAction(
  action: string,
  resourceType: AuditResourceType,
  resourceId: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from("audit_log").insert({
      user_id: null,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details ?? {},
    })
  } catch (e) {
    console.error("[audit] logAction failed", e)
  }
}
