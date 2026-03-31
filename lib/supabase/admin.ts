import { createClient } from "@supabase/supabase-js"

/**
 * Server-side only. Patron işlemleri (onay kuyruğu listeleme/güncelleme) için
 * patron_session cookie ile yetkili sayfalarında kullanılır.
 * RLS bypass — sadece güvenilir server kodunda kullan.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase admin client: URL veya SERVICE_ROLE_KEY eksik")
  return createClient(url, key)
}
