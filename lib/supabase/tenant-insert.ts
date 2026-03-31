import type { SupabaseClient } from "@supabase/supabase-js"

type TenantInsertInput = {
  tenantName: string
  slug: string
  email?: string | null
  phone?: string | null
  ownerName?: string | null
  packageType?: string | null
  status?: string
  setupCompleted?: boolean
  tokenBalance?: number
  updatedAt?: string
  subdomain?: string
}

function isSchemaColumnError(message: string): boolean {
  return /column .* does not exist/i.test(message)
}

/**
 * Tenants tablosu iki farkli sema ile kullanildigi icin (ad/durum vs name/status),
 * once Turkish kolonlarla dener; kolon hatasinda English semaya fallback yapar.
 */
export async function insertTenantWithFallback(
  supabase: SupabaseClient,
  input: TenantInsertInput
): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> {
  const primaryPayload = {
    ad: input.tenantName,
    slug: input.slug,
    email: input.email ?? null,
    phone: input.phone ?? null,
    package_type: input.packageType ?? null,
    durum: input.status ?? "aktif",
    setup_completed: input.setupCompleted ?? false,
    token_balance: input.tokenBalance ?? 0,
    guncelleme_tarihi: input.updatedAt ?? new Date().toISOString(),
  }

  const primary = await supabase
    .from("tenants")
    .insert(primaryPayload)
    .select("*")
    .single()

  if (!primary.error) {
    return { data: (primary.data as Record<string, unknown>) ?? null, error: null }
  }

  if (!isSchemaColumnError(primary.error.message)) {
    return { data: null, error: { message: primary.error.message } }
  }

  const fallbackPayload = {
    name: input.tenantName,
    slug: input.slug,
    subdomain: input.subdomain ?? input.slug,
    owner_email: input.email ?? null,
    owner_name: input.ownerName ?? input.tenantName,
    paket: input.packageType ?? null,
    status: input.status ?? "aktif",
    settings: { tema: "koyu", dil: "tr" },
  }

  const fallback = await supabase
    .from("tenants")
    .insert(fallbackPayload)
    .select("*")
    .single()

  if (fallback.error) {
    return { data: null, error: { message: fallback.error.message } }
  }

  return { data: (fallback.data as Record<string, unknown>) ?? null, error: null }
}
