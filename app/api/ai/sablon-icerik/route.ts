import { NextResponse } from "next/server"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * AI Sablon Icerik Uretimi
 * POST: Sablon turune gore AI ile icerik uretir.
 * Rate limiting: IP basina dakikada 10 istek.
 */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10

function cleanupExpiredEntries(now: number) {
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    cleanupExpiredEntries(now)
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

const CATEGORY_PROMPTS: Record<string, string> = {
  tesis_tanitim:
    "Bir spor tesisi tanitim sablonu icin profesyonel, ikna edici bir tanitim metni yaz. Tesisin ozellikleri, avantajlari ve hizmetlerini vurgula.",
  ders_programi:
    "Bir spor akademisi icin haftalik ders programi sablonu olustur. Farkli branslar, saatler ve seviyeler iceren duzenli bir format kullan.",
  sporcu_degerlendirme:
    "Bir sporcu performans degerlendirme raporu sablonu olustur. Teknik beceriler, fiziksel ozellikler, mental durum ve gelisim onerileri icerir.",
  veli_bilgilendirme:
    "Sporcu velilerine gonderilecek bilgilendirme yazisi yaz. Cocugun gelisimi, basarilari, gelecek hedefler ve oneriler hakkinda bilgi ver.",
  finansal_rapor:
    "Spor tesisi icin aylik finansal rapor sablonu olustur. Gelir-gider ozeti, uyelik istatistikleri, kar marji ve butce karsilastirmasi icerir.",
  sosyal_medya:
    "Spor tesisi icin bir haftalik sosyal medya icerik plani olustur. Instagram, Twitter ve Facebook icin post onerileri, hashtag ve gorsellendirme fikirleri icerir.",
  rapor:
    "Genel amacli profesyonel rapor sablonu olustur. Yonetici ozeti, bulgular, analiz ve oneriler bolumlerini icerir.",
  dashboard:
    "Dashboard sablon icerigi olustur. Temel metrikler, KPI'lar, trendler ve ozet istatistikler iceren bir dashboard aciklamasi yaz.",
  ui:
    "UI/UX sablon aciklamasi yaz. Kullanici arayuzu bilesenleri, renk paleti, tipografi ve layout onerileri icerir.",
  email:
    "Profesyonel email sablonu icerigi yaz. Konu satiri, giris, ana mesaj, call-to-action ve kapatis bolumleri icerir.",
  bildirim:
    "Uygulama icin bildirim sablonlari olustur. Push notification, email bildirimi ve uygulama ici bildirim metinleri icerir.",
  genel:
    "Genel amacli profesyonel bir sablon icerigi yaz. Net, ozlu ve profesyonel bir dil kullan.",
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) {
    return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Cok fazla istek. Lutfen 1 dakika sonra tekrar deneyin." },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { template_name, category, description, directorate } = body

  if (!template_name) {
    return NextResponse.json({ error: "template_name zorunlu" }, { status: 400 })
  }

  const categoryPrompt = CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS.genel

  const systemPrompt = `Sen YiSA-S spor yonetim sistemi icin icerik ureten bir AI asistansin.
Turkce yaz. Profesyonel ama samimi bir dil kullan.
Spor tesisi yonetimi baglaminda icerik uret.
Markdown formatinda yaz. Baslik, alt baslik ve madde isaretleri kullan.`

  const userPrompt = `Sablon: "${template_name}"
Kategori: ${category ?? "genel"}
${description ? `Aciklama: ${description}` : ""}
${directorate ? `Direktorluk: ${directorate}` : ""}

Gorev: ${categoryPrompt}

Bu sablon icin detayli, kullanima hazir icerik uret. Icerigi doldurmak icin ornek veriler ve profesyonel metinler kullan.`

  // Try Gemini first, then OpenAI, then fallback
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1500,
            },
          }),
        }
      )
      const data = await res.json()
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (content) {
        return NextResponse.json({ content, provider: "gemini" })
      }
    } catch {
      // fallthrough
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      })
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (content) {
        return NextResponse.json({ content, provider: "openai" })
      }
    } catch {
      // fallthrough
    }
  }

  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      })
      const data = await res.json()
      const content = data?.content?.[0]?.text
      if (content) {
        return NextResponse.json({ content, provider: "anthropic" })
      }
    } catch {
      // fallthrough
    }
  }

  // Fallback: generate template content locally
  const fallbackContent = generateFallbackContent(template_name, category ?? "genel", directorate ?? null)
  return NextResponse.json({ content: fallbackContent, provider: "fallback" })
}

function generateFallbackContent(name: string, category: string, directorate: string | null): string {
  const dir = directorate ? ` (${directorate})` : ""
  const sections: Record<string, string> = {
    tesis_tanitim: `# ${name}${dir}

## Tesis Tanitimi

### Hakkimizda
YiSA-S Spor Akademisi olarak, profesyonel spor egitimi ve sporcu gelisimi alaninda hizmet vermekteyiz.

### Hizmetlerimiz
- **Jimnastik Egitimi** — Baslangic, orta ve ileri seviye
- **Yuzme Kurslari** — Cocuk ve yetiskin gruplari
- **Fitness & Pilates** — Bireysel ve grup dersleri
- **Basketbol Akademisi** — Altyapi ve profesyonel

### Iletisim
📍 Adres: Istanbul, Turkiye
📞 Telefon: +90 (212) 000 00 00
📧 Email: info@yisa-s.com`,

    ders_programi: `# ${name}${dir}

## Haftalik Ders Programi

| Saat | Pazartesi | Sali | Carsamba | Persembe | Cuma |
|------|-----------|------|----------|----------|------|
| 09:00 | Jimnastik A | Yuzme | Jimnastik B | Yuzme | Jimnastik A |
| 10:30 | Basketbol | Voleybol | Futsal | Basketbol | Voleybol |
| 14:00 | Pilates | Yoga | Fitness | Pilates | Yoga |
| 16:00 | Cocuk Jimnastik | Cocuk Yuzme | Cocuk Basketbol | Cocuk Jimnastik | Serbest |

### Notlar
- Resmi tatil gunlerinde ders yapilmaz
- Grup degisiklikleri icin en az 3 gun once bildirim yapiniz`,

    finansal_rapor: `# ${name}${dir}

## Aylik Finansal Rapor — Mart 2026

### Gelir Ozeti
| Kalem | Tutar |
|-------|-------|
| Uyelik Gelirleri | 185.000 TRY |
| Kurs Gelirleri | 65.000 TRY |
| Magaza Satislari | 35.000 TRY |
| **Toplam Gelir** | **285.000 TRY** |

### Gider Ozeti
| Kalem | Tutar |
|-------|-------|
| Personel Giderleri | 82.000 TRY |
| Kira & Bakim | 35.000 TRY |
| Malzeme & Ekipman | 15.500 TRY |
| Diger | 10.000 TRY |
| **Toplam Gider** | **142.500 TRY** |

### Net Kar: **142.500 TRY**`,

    sosyal_medya: `# ${name}${dir}

## Haftalik Sosyal Medya Plani

### Pazartesi
📸 **Instagram:** Sporcu basari hikayesi + motivasyon alintisi
🐦 **Twitter:** Haftanin antrenman ipu

### Carsamba
📸 **Instagram:** Yeni ders programi duyurusu (carousel)
📘 **Facebook:** Etkinlik davetiyesi paylasimi

### Cuma
📸 **Instagram:** Reels — antrenman klipleri montaji
🐦 **Twitter:** Hafta sonu etkinlik hatirlatmasi

### Hashtag Onerileri
#YiSAS #SporAkademisi #Jimnastik #SporHayatKurtar`,
  }

  return sections[category] ?? `# ${name}${dir}

## Sablon Icerigi

Bu sablon, ${category} kategorisinde olusturulmustur.

### Bolumler
1. **Giris** — Genel tanitim ve amac
2. **Detaylar** — Ana icerik ve veriler
3. **Sonuc** — Ozet ve oneriler

---
*Bu icerik YiSA-S sistemi tarafindan otomatik olusturulmustur.*`
}
