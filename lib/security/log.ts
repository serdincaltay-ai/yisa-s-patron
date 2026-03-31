import { createAdminClient } from "@/lib/supabase/admin"

export type SecurityEventType =
  | "login"
  | "logout"
  | "mfa_attempt"
  | "ip_block"
  | "password_change"
  | "role_change"
  | "api_access"

interface SecurityLogParams {
  userId?: string
  eventType: SecurityEventType
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
  success?: boolean
}

/**
 * Güvenlik olayını security_logs tablosuna kaydeder.
 * Server-side only — API route veya middleware'den çağrılır.
 */
export async function logSecurityEvent(params: SecurityLogParams): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from("security_logs").insert({
      user_id: params.userId ?? null,
      event_type: params.eventType,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      details: params.details ?? {},
      success: params.success ?? true,
    })
  } catch (e) {
    // Güvenlik logu yazılamasa bile uygulamayı durdurma
    console.error("[SecurityLog] Yazma hatası:", e)
  }
}

/**
 * Request'ten IP adresini çıkarır.
 */
export function extractIP(request: Request): string {
  const headers = new Headers(request.headers)
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * Request'ten user-agent'ı çıkarır.
 */
export function extractUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown"
}
