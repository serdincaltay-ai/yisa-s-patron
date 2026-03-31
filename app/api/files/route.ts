import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder")

  const supabase = await createClient()
  let query = supabase.from("files").select("*").order("created_at", { ascending: false })
  if (folder) query = query.eq("folder", folder)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File
  const folder = (formData.get("folder") as string) || "genel"

  if (!file) return NextResponse.json({ error: "Dosya zorunlu" }, { status: 400 })

  // Vercel Blob'a yukle
  const blob = await put(`yisa-s/${folder}/${file.name}`, file, { access: "public" })

  // Supabase'e kayit ekle
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("files")
    .insert({
      folder,
      file_name: file.name,
      file_url: blob.url,
      file_type: file.type || "document",
      file_size: file.size,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
