import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * GET: Şablon listesi (ceo_templates). directorate, category ile filtre.
 * POST: Yeni şablon ekle (ceo_templates).
 */
export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const directorate = searchParams.get("directorate")
  const category = searchParams.get("category")
  const templateKey = searchParams.get("template_key")

  const supabase = createAdminClient()
  let query = supabase
    .from("ceo_templates")
    .select("id, template_name, template_type, director_key, content, created_at")
    .order("created_at", { ascending: false })

  if (directorate) query = query.eq("director_key", directorate)
  if (category) query = query.eq("template_type", category)
  if (templateKey) query = query.ilike("template_name", `%${templateKey}%`)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data || []).map((row) => {
    const content = row.content as Record<string, unknown> | null
    const descriptionFromPlan =
      typeof content?.plan === "string" ? content.plan : null

    return {
      id: row.id,
      name: row.template_name,
      description: descriptionFromPlan ?? `${row.template_type || "genel"} sablonu`,
      category: row.template_type || "genel",
      tier: "standart",
      directorate: row.director_key || null,
      created_at: row.created_at,
    }
  })

  return NextResponse.json({ data: normalized })
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { directorate, category, template_key, content, variables } = body

  if (!template_key || !content) {
    return NextResponse.json({ error: "template_key ve content zorunlu" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("ceo_templates")
    .insert({
      template_name: template_key,
      template_type: category || "rapor",
      director_key: directorate || null,
      content,
      variables: Array.isArray(variables) ? variables : [],
      data_sources: [],
      is_approved: false,
      approved_by: null,
      version: 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
