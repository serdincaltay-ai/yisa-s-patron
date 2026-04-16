import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"
import { callGemini } from "@/lib/ai-providers"
import { getDirectorateBySlug } from "@/lib/direktorlukler/config"

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) {
    return NextResponse.json({ error: "Patron oturumu gerekli" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const directorateSlug =
      typeof body.directorate_slug === "string" ? body.directorate_slug.trim() : ""
    const patronPrompt =
      typeof body.prompt === "string" ? body.prompt.trim() : ""

    if (!directorateSlug) {
      return NextResponse.json({ error: "directorate_slug zorunludur" }, { status: 400 })
    }

    const directorate = getDirectorateBySlug(directorateSlug)
    if (!directorate) {
      return NextResponse.json({ error: "Direktorluk bulunamadi" }, { status: 404 })
    }

    const effectivePrompt =
      patronPrompt || "Bu direktorluk icin bu hafta oncelikli aksiyon komutu oner."

    const systemPrompt = `Sen YİSA-S CELF ${directorate.name} asistanisin.
Direktorluk kodu: ${directorate.code}
Odak alani: ${directorate.description}
Yanit dili: Turkce
Gorev: Patronun istegini tek bir net CELF komutuna donustur.
Kurallar:
- Cikti yalnizca uygulanabilir komut metni olmali.
- Gereksiz aciklama yapma.
- Spor tesisi yonetimi baglami disina cikma.`

    const result = await callGemini(effectivePrompt, systemPrompt)
    const suggestion = result.plan?.trim()

    if (!suggestion || suggestion === "STUB (API key yok)" || suggestion === "Hata") {
      return NextResponse.json(
        { error: "Gemini asistani su anda yanit uretemedi. API ayarlarini kontrol edin." },
        { status: 503 }
      )
    }

    return NextResponse.json({
      suggestion,
      provider: "gemini-2.0-flash",
      directorate: {
        slug: directorate.slug,
        code: directorate.code,
        name: directorate.name,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Asistan hatasi" },
      { status: 500 }
    )
  }
}
