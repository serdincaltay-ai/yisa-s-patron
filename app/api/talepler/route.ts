import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

export const dynamic = "force-dynamic"

/**
 * Talepler birlesik listesi.
 * TaleplerList bileseninin beklediği formatta doner:
 * { items: TalepItem[] }
 *
 * demo_requests + franchise_basvurulari tablolarindan birlestirip sunar.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })

  try {
    const supabase = createAdminClient()

    // 1) demo_requests — tum talepler
    const { data: demoRequests, error: demoErr } = await supabase
      .from("demo_requests")
      .select("id, name, email, phone, facility_type, city, notes, status, source, durum, created_at, payment_status")
      .order("created_at", { ascending: false })
      .limit(100)

    if (demoErr) {
      return NextResponse.json({ error: demoErr.message }, { status: 500 })
    }

    // 2) franchise_basvurulari — franchise basvurulari
    const { data: franchiseApps, error: franchiseErr } = await supabase
      .from("franchise_basvurulari")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    // franchise_basvurulari tablosu bos olabilir, hata varsa devam et
    if (franchiseErr) {
      console.warn("franchise_basvurulari fetch warning:", franchiseErr.message)
    }

    // Status mapping helper
    const mapDemoStatus = (status: string, durum: string): "beklemede" | "onaylandi" | "reddedildi" => {
      if (durum === "onaylandi" || status === "converted" || status === "approved") return "onaylandi"
      if (durum === "reddedildi" || status === "rejected") return "reddedildi"
      return "beklemede"
    }

    // Type inference from source/facility_type
    const inferType = (source: string | null, facilityType: string | null): "franchise" | "veli" | "personel" | "diger" => {
      if (source === "demo" || source === "franchise") return "franchise"
      if (source === "www" || source === "veli") return "veli"
      if (source === "personel") return "personel"
      if (facilityType) return "franchise"
      return "diger"
    }

    // demo_requests -> TalepItem[]
    const demoItems = (demoRequests ?? []).map((req) => {
      const notes = req.notes as string | null
      const parsedNotes = notes && notes.startsWith("{") ? tryParseJson(notes) : null

      return {
        id: req.id as string,
        type: inferType(req.source as string | null, req.facility_type as string | null),
        requester_name: (req.name as string) || "Bilinmiyor",
        subject: parsedNotes
          ? `${(parsedNotes.child?.name as string) || ""} - ${(parsedNotes.child?.sport as string) || "Kayit"}`.trim()
          : (req.facility_type as string)
            ? `${req.facility_type} Tesis Talebi`
            : "Demo Talep",
        detail: parsedNotes
          ? `Veli: ${(parsedNotes.veli?.name as string) || ""}, Sehir: ${(parsedNotes.veli?.city as string) || (req.city as string) || ""}`
          : (notes as string) || null,
        status: mapDemoStatus((req.status as string) || "", (req.durum as string) || ""),
        created_at: req.created_at as string,
        tenant_name: (req.city as string) || null,
      }
    })

    // franchise_basvurulari -> TalepItem[] (bos olabilir)
    const franchiseItems = (franchiseApps ?? []).map((app) => ({
      id: (app.id as string) || "",
      type: "franchise" as const,
      requester_name: (app.firma_adi as string) || (app.yetkili_adi as string) || "Bilinmiyor",
      subject: `Franchise Basvurusu - ${(app.firma_adi as string) || ""}`,
      detail: (app.notlar as string) || (app.mesaj as string) || null,
      status: mapFranchiseStatus((app.durum as string) || (app.status as string) || ""),
      created_at: (app.created_at as string) || new Date().toISOString(),
      tenant_name: (app.sehir as string) || (app.city as string) || null,
    }))

    // Birlestir ve tarihe gore sirala
    const items = [...demoItems, ...franchiseItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function mapFranchiseStatus(status: string): "beklemede" | "onaylandi" | "reddedildi" {
  if (status === "onaylandi" || status === "approved" || status === "converted") return "onaylandi"
  if (status === "reddedildi" || status === "rejected") return "reddedildi"
  return "beklemede"
}

function tryParseJson(str: string): Record<string, Record<string, unknown>> | null {
  try {
    return JSON.parse(str) as Record<string, Record<string, unknown>>
  } catch {
    return null
  }
}
