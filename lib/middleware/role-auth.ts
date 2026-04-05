/**
 * YİSA-S Role-Based Access Control (RBAC) Middleware
 *
 * Roller:
 *   patron          — Sistem sahibi, tüm tenant'lara ve tüm işlevlere erişim
 *   franchise_sahibi — Tesis sahibi, kendi tenant'ına ait tüm verilere erişim
 *   antrenor        — Kendi gruplarına ve öğrencilerine erişim
 *   veli            — Yalnızca kendi çocuğunun verisine erişim
 *
 * Kullanım:
 *   import { requireRole, requireAnyRole, getUserRole } from "@/lib/middleware/role-auth"
 *
 *   // API route'ta:
 *   const auth = await requireRole("patron")
 *   if (!auth.ok) return auth.response
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { UserRole } from "@/lib/types"

/* ------------------------------------------------------------------ */
/*  Rol hiyerarşisi ve erişim haritası                                 */
/* ------------------------------------------------------------------ */

/** Rol hiyerarşi seviyesi (yüksek = daha fazla yetki) */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  patron: 100,
  mudur: 90,
  tenant_owner: 80,
  franchise_sahibi: 80,
  admin: 70,
  kasa: 50,
  coach: 40,
  antrenor: 40,
  veli: 10,
}

/** Her rolün erişebileceği path prefix'leri */
export const ROLE_ACCESS_MAP: Record<UserRole, string[]> = {
  patron: [
    "/dashboard",
    "/patron",
    "/franchise",
    "/mudur",
    "/tesis",
    "/antrenor",
    "/veli",
    "/panel",
    "/kurulum",
    "/magaza",
    "/personel",
    "/sozlesme",
    "/api",
  ],
  tenant_owner: [
    "/franchise",
    "/tesis",
    "/antrenor",
    "/panel",
    "/magaza",
    "/personel",
    "/sozlesme",
    "/api/franchise",
    "/api/social",
    "/api/child-development",
    "/api/tenants",
  ],
  franchise_sahibi: [
    "/franchise",
    "/tesis",
    "/antrenor",
    "/panel",
    "/magaza",
    "/personel",
    "/sozlesme",
    "/api/franchise",
    "/api/social",
    "/api/child-development",
    "/api/tenants",
  ],
  mudur: [
    "/mudur",
    "/franchise",
    "/tesis",
    "/antrenor",
    "/panel",
    "/personel",
    "/api/franchise",
    "/api/mudur",
  ],
  admin: [
    "/franchise",
    "/tesis",
    "/panel",
    "/personel",
    "/api/franchise",
  ],
  kasa: [
    "/franchise",
    "/tesis",
    "/api/franchise/kasa",
    "/api/franchise/payments",
    "/api/expenses",
  ],
  coach: [
    "/antrenor",
    "/tesis",
    "/api/franchise/athletes",
    "/api/franchise/attendance",
    "/api/franchise/schedule",
    "/api/child-development",
  ],
  antrenor: [
    "/antrenor",
    "/tesis",
    "/api/franchise/athletes",
    "/api/franchise/attendance",
    "/api/franchise/schedule",
    "/api/child-development",
  ],
  veli: [
    "/veli",
    "/api/veli",
  ],
}

/** Her rolün Türkçe görüntüleme adı */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  patron: "Patron",
  mudur: "Müdür",
  tenant_owner: "Tesis Sahibi",
  franchise_sahibi: "Franchise Sahibi",
  admin: "Yönetici",
  kasa: "Kasa Sorumlusu",
  coach: "Antrenör",
  antrenor: "Antrenör",
  veli: "Veli",
}

/* ------------------------------------------------------------------ */
/*  Supabase admin client                                              */
/* ------------------------------------------------------------------ */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/* ------------------------------------------------------------------ */
/*  Kullanıcı rol çözümleme                                            */
/* ------------------------------------------------------------------ */

export interface AuthResult {
  ok: true
  userId: string
  email: string
  role: UserRole
  tenantId: string | null
}

export interface AuthError {
  ok: false
  response: NextResponse
}

/**
 * Mevcut oturumdaki kullanıcının rolünü döner.
 *
 * Patron kontrolü:
 *   - Email ile DEĞİL, user_tenants tablosundaki role='patron' ile belirlenir.
 *   - Patron = super admin (Serdinç Altay). Tüm sisteme tam erişim.
 *
 * Diğer roller user_tenants tablosundan çözümlenir.
 */
export async function getUserRole(): Promise<{
  userId: string | null
  email: string | null
  role: UserRole | null
  tenantId: string | null
}> {
  const admin = getAdminClient()
  if (!admin) {
    return { userId: null, email: null, role: null, tenantId: null }
  }

  // 1. Supabase auth ile kullanıcı bilgisi al
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return { userId: null, email: null, role: null, tenantId: null }
  }

  try {
    const c = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return c.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              c.set(name, value, options),
            )
          } catch {
            // Can be ignored if middleware refreshes sessions
          }
        },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { userId: null, email: null, role: null, tenantId: null }
    }

    // 2. user_tenants tablosundan rol bilgisi çek
    //    Patron rolü burada belirlenir — email kontrolü YOK.
    //    DB'deki role='patron' olan tek kullanıcı super admin'dir.
    const { data: userTenant } = await admin
      .from("user_tenants")
      .select("role, tenant_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userTenant) {
      const role = userTenant.role as UserRole
      return {
        userId: user.id,
        email: user.email ?? null,
        role,
        // Patron tüm tenant'lara erişebilir, tenant_id null olabilir
        tenantId: role === "patron" ? null : userTenant.tenant_id,
      }
    }

    // user_tenants kaydı yoksa → yetkisiz kullanıcı
    return {
      userId: user.id,
      email: user.email ?? null,
      role: null,
      tenantId: null,
    }
  } catch {
    return { userId: null, email: null, role: null, tenantId: null }
  }
}

/* ------------------------------------------------------------------ */
/*  Yetkilendirme fonksiyonları                                        */
/* ------------------------------------------------------------------ */

/**
 * Belirtilen rolü gerektirir. Hiyerarşik: üst roller alt rollere de erişebilir.
 */
export async function requireRole(minRole: UserRole): Promise<AuthResult | AuthError> {
  const auth = await getUserRole()

  if (!auth.userId || !auth.role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Yetkilendirme gerekli. Lütfen giriş yapın." },
        { status: 401 }
      ),
    }
  }

  const userLevel = ROLE_HIERARCHY[auth.role] ?? 0
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0

  if (userLevel < requiredLevel) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Bu işlem için '${ROLE_DISPLAY_NAMES[minRole]}' veya üstü yetki gerekli.` },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    userId: auth.userId,
    email: auth.email ?? "",
    role: auth.role,
    tenantId: auth.tenantId,
  }
}

/**
 * Belirtilen rollerden herhangi birini gerektirir.
 */
export async function requireAnyRole(...roles: UserRole[]): Promise<AuthResult | AuthError> {
  const auth = await getUserRole()

  if (!auth.userId || !auth.role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Yetkilendirme gerekli. Lütfen giriş yapın." },
        { status: 401 }
      ),
    }
  }

  if (!roles.includes(auth.role)) {
    // Patron her şeye erişebilir
    if (auth.role !== "patron") {
      const allowedNames = roles.map((r) => ROLE_DISPLAY_NAMES[r]).join(", ")
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Bu işlem için şu rollerden biri gerekli: ${allowedNames}` },
          { status: 403 }
        ),
      }
    }
  }

  return {
    ok: true,
    userId: auth.userId,
    email: auth.email ?? "",
    role: auth.role,
    tenantId: auth.tenantId,
  }
}

/**
 * Path'e göre rol erişim kontrolü yapar.
 */
export function canAccessPath(role: UserRole, pathname: string): boolean {
  // Patron her yere erişebilir
  if (role === "patron") return true

  const allowedPaths = ROLE_ACCESS_MAP[role] ?? []
  return allowedPaths.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Kullanıcının belirtilen tenant'a erişimi var mı kontrol eder.
 */
export async function canAccessTenant(userId: string, tenantId: string): Promise<boolean> {
  const admin = getAdminClient()
  if (!admin) return false

  const { data } = await admin
    .from("user_tenants")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle()

  return !!data
}
