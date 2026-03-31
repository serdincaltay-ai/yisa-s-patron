import { getUserRole } from "@/lib/middleware/role-auth"

/**
 * Patron (super admin) yetkisi gerektirir.
 * Patron kontrolü email ile DEĞİL, user_tenants tablosundaki role='patron' ile yapılır.
 * Eski patron_session cookie yöntemi kaldırıldı.
 */
export async function requirePatron(): Promise<boolean> {
  const auth = await getUserRole()
  return auth.role === "patron"
}
