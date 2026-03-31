/**
 * CORS — Vitrin (yisa-s.com) → Patron API (app.yisa-s.com)
 * İzinli origin'ler ve preflight/response header helper'ları.
 */

export const ALLOWED_ORIGINS = [
  "https://yisa-s.com",
  "https://www.yisa-s.com",
  "http://localhost:3000",
  "http://localhost:3001",
] as const

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
  "Access-Control-Max-Age": "86400",
}

/**
 * İstekteki Origin header'ı izinli listede varsa döndürür, yoksa ilk origin (yisa-s.com).
 */
export function getAllowedOrigin(origin: string | null): string {
  if (origin && ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number])) {
    return origin
  }
  return ALLOWED_ORIGINS[0]
}

/**
 * Preflight (OPTIONS) için 200 response header'ları.
 * Kullanım: new Response(null, { status: 200, headers: { ...corsPreflightHeaders(origin), ...CORS_HEADERS } })
 */
export function corsPreflightHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    ...CORS_HEADERS,
  }
}

/**
 * Normal API response'a eklenecek CORS header'ları.
 */
export function corsResponseHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    ...CORS_HEADERS,
  }
}
