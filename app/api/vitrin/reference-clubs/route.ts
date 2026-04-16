import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

interface ReferenceClub {
  id: string
  name: string
  city: string
  sport: string
  order: number
}

function normalizeClubs(input: unknown): ReferenceClub[] {
  if (!Array.isArray(input)) return []
  return input
    .map((club, index) => {
      const row = club as Record<string, unknown>
      const name = typeof row.name === "string" ? row.name.trim() : ""
      if (!name) return null
      return {
        id:
          typeof row.id === "string" && row.id.trim()
            ? row.id.trim()
            : `club-${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        city: typeof row.city === "string" ? row.city.trim() : "",
        sport: typeof row.sport === "string" ? row.sport.trim() : "",
        order: Number.isFinite(row.order) ? Number(row.order) : index + 1,
      }
    })
    .filter((row): row is ReferenceClub => Boolean(row))
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({ ...row, order: index + 1 }))
}

async function getReferenceSlot(tenantId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("tenant_template_slots")
    .select("id, tenant_id, slot_code, content, updated_at")
    .eq("tenant_id", tenantId)
    .eq("slot_code", "referans")
    .maybeSingle()
  return { data, error }
}

export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get("tenant_id")
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id zorunlu" }, { status: 400 })
  }

  const { data: slot, error } = await getReferenceSlot(tenantId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!slot) {
    return NextResponse.json({ clubs: [], syncedAt: null })
  }

  const content = (slot.content ?? {}) as Record<string, unknown>
  const clubs = normalizeClubs(content.clubs)
  return NextResponse.json({ clubs, syncedAt: slot.updated_at ?? null })
}

export async function PUT(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : ""
  const clubs = normalizeClubs(body.clubs)
  if (!tenantId) {
    return NextResponse.json({ error: "tenant_id zorunlu" }, { status: 400 })
  }

  const { data: slot, error: fetchError } = await getReferenceSlot(tenantId)
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!slot?.id) {
    return NextResponse.json(
      { error: "Referans slotu bulunamadi. Once tenant sablon slotlarini olusturun." },
      { status: 404 }
    )
  }

  const existingContent = (slot.content ?? {}) as Record<string, unknown>
  const nextContent = {
    ...existingContent,
    clubs,
    synced_at: new Date().toISOString(),
  }

  const supabase = createAdminClient()
  const { error: updateError } = await supabase
    .from("tenant_template_slots")
    .update({
      content: nextContent,
      updated_at: new Date().toISOString(),
      is_active: true,
    })
    .eq("id", slot.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    clubs,
    syncedAt: nextContent.synced_at,
  })
}
