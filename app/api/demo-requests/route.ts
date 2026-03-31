import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { withErrorHandling, ValidationError, RateLimitError, AuthenticationError } from "@/lib/errors"
import { rateLimitByEmail } from "@/lib/middleware/rate-limit"
import { log } from "@/lib/logger"
import { sendDemoRequestReceivedEmail, sendPatronNotificationEmail } from "@/lib/emails/resend"
import type { DemoRequest, ApiResponse, PaginatedResponse } from "@/lib/types"

/**
 * CORS preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_VITRIN_URL || "https://yisa-s.com",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

/**
 * Demo talep oluşturma (anonim erişim)
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const body = await request.json()
    // Support both legacy (firma_adi/yetkili_adi/telefon) and current (name/email/phone) field names
    const name = body.name || body.firma_adi || body.yetkili_adi
    const email = body.email
    const phone = body.phone || body.telefon
    const facility_type = body.facility_type || body.tesis_turu
    const city = body.city || body.sehir || "\u0130stanbul"
    const { tesis_metrekare, muhit, sablon_secimi, paket, source } = body
    const athleteCountRaw = body.athlete_count
    const notes = body.notes || body.mesaj || ""
    // Build structured notes from legacy fields if present
    const structuredNotes = body.firma_adi
      ? `Firma: ${body.firma_adi}${body.yetkili_adi ? `, Yetkili: ${body.yetkili_adi}` : ""}${tesis_metrekare ? `, ${tesis_metrekare}m\u00B2` : ""}${muhit ? `, Muhit: ${muhit}` : ""}${sablon_secimi ? `, Sablon: ${sablon_secimi}` : ""}${paket ? `, Paket: ${paket}` : ""}${notes ? `. ${notes}` : ""}`
      : notes

    // Zorunlu alan kontrolü
    if (!name || !email || !phone) {
      throw new ValidationError("name (veya firma_adi), email ve phone (veya telefon) zorunludur")
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new ValidationError("Geçersiz email formatı")
    }

    // Telefon format kontrolü (Türkiye: +90 veya 0 ile başlamalı)
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/
    const cleanPhone = phone.replace(/\s/g, "")
    if (!phoneRegex.test(cleanPhone)) {
      throw new ValidationError("Geçersiz telefon numarası formatı")
    }

    let athlete_count: number | null = null
    if (athleteCountRaw !== undefined && athleteCountRaw !== null && athleteCountRaw !== "") {
      const parsed = Number(athleteCountRaw)
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new ValidationError("athlete_count sayısal ve 0 veya büyük olmalıdır")
      }
      athlete_count = Math.floor(parsed)
    }

    // Rate limiting: Aynı email'den 24 saatte max 3 talep
    await rateLimitByEmail(email, 3, 24 * 60 * 60 * 1000)

    // Supabase service role client ile INSERT (anonim erişim için)
    // Not: Anonim kullanıcılar RLS'den geçemez, service role gerekir
    const supabase = createAdminClient()

    // athlete_count kolonu henüz DB'de yok — notlara ekle
    const athleteNote = athlete_count ? `Sporcu sayısı: ~${athlete_count}` : ""
    const combinedNotes = [structuredNotes, athleteNote].filter(Boolean).join(". ") || null

    const { data, error } = await supabase
      .from("demo_requests")
      .insert({
        name,
        email,
        phone: cleanPhone,
        facility_type: facility_type || null,
        city,
        notes: combinedNotes,
        source: source || "www",
        status: "new",
      })
      .select()
      .single()

    if (error) {
      log.error("Demo request insert error", new Error(error.message), { email, name })
      throw new Error("Demo talebi kaydedilemedi")
    }

    log.info("Demo request created", { id: data.id, name, email })

    // Email gönder (async, await etme)
    sendDemoRequestReceivedEmail(email, name).catch((err) => {
      log.error("Failed to send demo request email", err)
    })

    // Patron'a bildirim gönder (async, await etme)
    // Not: Patron email'i environment variable'dan alınacak
    const patronEmail = process.env.PATRON_EMAIL
    if (patronEmail) {
      sendPatronNotificationEmail(patronEmail, name).catch((err) => {
        log.error("Failed to send patron notification", err)
      })
    }

    return {
      success: true,
      id: data.id,
    } as ApiResponse<{ success: boolean; id: string }>
  })
}

/**
 * Demo talepleri listeleme (Supabase auth veya patron_session)
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const cookieStore = await cookies()
    const patronSession = cookieStore.get("patron_session")?.value === "authenticated"
    const supabase = patronSession ? createAdminClient() : await createClient()
    if (!patronSession) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AuthenticationError("Authentication required")
    }

    // Query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Query builder
    let query = supabase.from("demo_requests").select("*", { count: "exact" })

    // Status filtresi
    if (status) {
      query = query.eq("status", status)
    }

    // Sıralama ve pagination
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      log.error("Demo requests fetch error", new Error(error.message))
      throw new Error("Demo talepleri getirilemedi")
    }

    return {
      data: data || [],
      count: count || 0,
    } as PaginatedResponse<DemoRequest>
  })
}
