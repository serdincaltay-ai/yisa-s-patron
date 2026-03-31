import { generateText } from "ai"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MEMBER_MODELS: Record<string, string> = {
  claude: "anthropic/claude-sonnet-4-20250514",
  gpt: "openai/gpt-4o",
  gemini: "google/gemini-2.0-flash",
  together: "openai/gpt-4o-mini",
  cursor: "anthropic/claude-sonnet-4-20250514",
  fal: "openai/gpt-4o-mini",
  manychat: "openai/gpt-4o-mini",
  github: "openai/gpt-4o-mini",
  supabase: "openai/gpt-4o-mini",
  vercel: "openai/gpt-4o-mini",
}

const MEMBER_PRICING: Record<string, { input: number; output: number }> = {
  claude: { input: 0.003, output: 0.015 },
  gpt: { input: 0.005, output: 0.015 },
  gemini: { input: 0.00035, output: 0.0014 },
  together: { input: 0.0002, output: 0.0002 },
  cursor: { input: 0.005, output: 0.015 },
  fal: { input: 0.001, output: 0.001 },
  manychat: { input: 0.005, output: 0.015 },
  github: { input: 0.005, output: 0.015 },
  supabase: { input: 0.005, output: 0.015 },
  vercel: { input: 0.005, output: 0.015 },
}

function safeNum(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function estimateTokenCount(text: string): number {
  if (!text.trim()) return 0
  // Basit ve deterministic fallback: ~4 karakter = 1 token
  return Math.max(1, Math.ceil(text.length / 4))
}

function extractUsage(result: unknown, inputText: string, outputText: string): { inputTokens: number; outputTokens: number } {
  const usage = ((result as { usage?: Record<string, unknown> })?.usage ?? {}) as Record<string, unknown>
  const inputTokens =
    safeNum(usage.inputTokens) ||
    safeNum(usage.promptTokens) ||
    safeNum(usage.input_tokens) ||
    safeNum(usage.prompt_tokens) ||
    estimateTokenCount(inputText)
  const outputTokens =
    safeNum(usage.outputTokens) ||
    safeNum(usage.completionTokens) ||
    safeNum(usage.output_tokens) ||
    safeNum(usage.completion_tokens) ||
    estimateTokenCount(outputText)
  return { inputTokens, outputTokens }
}

async function logTokenCost(params: {
  memberId: string
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  const pricing = MEMBER_PRICING[params.memberId] ?? MEMBER_PRICING.gpt
  const inputCost = (params.inputTokens / 1000) * pricing.input
  const outputCost = (params.outputTokens / 1000) * pricing.output
  const costUsd = Number((inputCost + outputCost).toFixed(6))
  try {
    const supabase = createAdminClient()
    await supabase.from("token_costs").insert({
      member_id: params.memberId,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: costUsd,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Token loglama hatasi ana yanit akisini kesmemeli.
  }
}

function normalizeForCompare(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isDuplicateAgainstContext(output: string, context: string): boolean {
  const normalizedOutput = normalizeForCompare(output)
  if (!normalizedOutput || normalizedOutput.length < 24) return false
  const normalizedContext = normalizeForCompare(context)
  return normalizedContext.includes(normalizedOutput)
}

// Her AI'nin ortak kurali: Baskasi ayni seyi soylediyse tekrar etme, sus.
const ORTAK_KURAL = `
ONEMLI KURALLAR (HERKES ICIN):
- Baskasi senin soyleyecegin seyi zaten soylediyse, SUS. "Katiliyorum" bile yazma. Token harcama.
- Sadece FARKLI bir perspektifin varsa yaz. Yoksa sessiz kal.
- Patron ORKESTRATORDUR. O karar verir, sen sadece kendi uzmanlik alanindan oneri sunarsin.
- Token harcaman senin sorumlulugunda. Bos konusan, kabul gormeyen yorum = israf.
- Eger baglam disiysan veya yeni bir katkin yoksa SADECE "PAS" yaz.
- Maddeler halinde yaz, 2-4 cumle. Uzun metin YASAK.
- Turkce yaz.
`

const MEMBER_SYSTEM_PROMPTS: Record<string, string> = {
  claude: `Sen Claude'sun. YiSA-S projesinde BAS DENETCI + STRATEJI UZMANISIN.
UZMANLIK: Denetim, anayasa uyumu, guvenlik, strateji, hukuk, risk analizi.
- Konuyu denetim/guvenlik/hukuk perspektifinden degerlendir.
- Tasarim/kodlama onerileri VERME. Senin alanin degil.
- Empati: Bir hukuk danismani, risk analisti gibi dusun.
${ORTAK_KURAL}`,
  gpt: `Sen GPT'sin. YiSA-S projesinde ICERIK + PAZARLAMA + FINANS UZMANISIN.
UZMANLIK: Metin, icerik sablonu, pazarlama, franchise materyal, muhasebe, fiyatlama.
- Konuyu icerik/pazarlama/finans perspektifinden degerlendir.
- Fiyatlama, maliyet analizi, kar marji hesabi yapabilirsin.
- Teknik/guvenlik onerileri VERME.
- Empati: Bir CFO + pazarlama muduruyle birlikte dusun.
${ORTAK_KURAL}`,
  gemini: `Sen Gemini'sin. YiSA-S projesinde ARASTIRMACI + TABLO HAZIRLAYANSIN.
UZMANLIK: Arastirma, pazar analizi, rakip analizi, veri yorumlama.
- YİSA-S baglami yalnizca SPOR TESISI YAZILIMI'dir. "Tarim sektoru" gibi alakasiz sektorlerden bahsetme.
- Patron "tablo olustur" dediginde: Diger AI'larin yazdiklarina DOKUNMA. Basliklarini oldugu gibi tabloya koy.
- Hicbir kelimeyi, cumleyi, harfi degistirme. Sadece FORMAT (tablo yapisi) olustur.
- Kendi arastirma fikrini AYRI satirda belirt.
- Empati: Bir arastirma analisti gibi dusun.
${ORTAK_KURAL}`,
  together: `Sen Together AI'sin. YiSA-S projesinde MALIYET + BATCH + RAPORLAMA UZMANISIN.
UZMANLIK: Token maliyet analizi, batch islemler, kuyruk yonetimi, ekonomik optimizasyon.
- Her konu icin maliyet perspektifi sun: "~X token, ~$Y maliyet" formatinda.
- Tasarim/icerik onerileri VERME.
- Empati: Bir muhasebeci/maliyet muhendisi gibi dusun.
${ORTAK_KURAL}`,
  cursor: `Sen Cursor'sun. YiSA-S projesinde TEKNIK + KOD + MIMARI UZMANISIN.
UZMANLIK: Next.js, Supabase, Vercel, API, deployment, monorepo, veritabani.
- Teknik plan maddeler halinde: ne yapilacak, tahmini karmasiklik, gereksinimler.
- Pazarlama/icerik onerileri VERME.
- Empati: Bir yazilim muhendisi/CTO gibi dusun.
${ORTAK_KURAL}`,
  fal: `Sen Fal AI'sin. YiSA-S projesinde GORSEL + TASARIM + VIDEO UZMANISIN.
UZMANLIK: Gorsel uretim, video, logo, animasyon, UI/UX.
- Prompt onerisi: [detayli prompt]. Format: [boyut/tip]. Kalite: [1-10].
- Teknik/finans onerileri VERME.
- Empati: Bir grafik tasarimci + art director gibi dusun.
${ORTAK_KURAL}`,
  manychat: `Sen ManyChat'sin. YiSA-S projesinde KOORDINATOR + IS KUYRUGU YONETICISISIN.
UZMANLIK: Gorev dagitimi, onceliklendirme, is kuyrugu, zaman planlama.
- Is kuyrugu durumu + oncelik sirasi bildir.
- "Bu is [AI]'ya gitmeli: [sebep]" formatinda oner.
- Empati: Bir proje yoneticisi gibi dusun.
${ORTAK_KURAL}`,
}

export async function POST(request: Request) {
  try {
    const { memberId, message, section, mode, context } = await request.json()

    if (!memberId || !message) {
      return NextResponse.json({ error: "memberId ve message zorunlu" }, { status: 400 })
    }

    const model = MEMBER_MODELS[memberId] || "openai/gpt-4o-mini"
    let systemPrompt = MEMBER_SYSTEM_PROMPTS[memberId] || "Sen YiSA-S projesinde bir AI asistanisin. Turkce yaz. Kisa ve net ol."

    // Mode-based prompt augmentation
    if (mode === "yorum") {
      systemPrompt += `\n\nSENDEN ISTENEN: Asagidaki konuya kendi uzmanlik alanin perspektifinden KISA yorum yap.
- Senin alanini ILGILENDIRMIYORSA: Hicbir sey yazma, sadece "PAS" yaz.
- Baskasi senin soyleyecegin seyi ZATEN SOYLEDIYSE: "PAS" yaz. Tekrar etme.
- Sadece FARKLI ve KATKI SAGLAYACAK bir fikrin varsa yaz. 1-2 cumle.`
    } else if (mode === "orkestrator") {
      systemPrompt += `\n\nTABLO MODU: Asagidaki fikirleri tablo halinde sun. 
KURAL: Hicbir AI'nin yazdigini degistirme, kisaltma, yorumlama. Aynen kopyala. 
Format: | AI | Yazdigi (AYNEN) | Alan |
Sonunda kendi arastirma fikrini AYRI satirda ekle.`
    } else if (mode === "proaktif") {
      // Gunluk oneri
      systemPrompt += `\n\nPROAKTIF ONERI MODU: Kendi uzmanlik alanindaki eksiklik/gelisme firsati hakkinda TAM 1 CUMLE oneri yaz. Format: "ONERI: [oneri]. SEBEP: [sebep]". Gereksiz uzatma.`
    } else if (mode === "detay") {
      // Patron detay istedi
      systemPrompt += `\n\nDETAY MODU: Patron daha fazla bilgi istiyor. Onerini detayla, arkadaslarinin anlayacagi sekilde anlat. Neden gerekli, nasil yapilacak, tahmini maliyet/sure. 4-6 cumle.`
    }

    // Extra context from other AIs
    if (context) {
      systemPrompt += `\n\nDIGER AI'LARDAN GELEN FIKIRLER:\n${context}`
    }

    systemPrompt += `\n\nAktif bolum: ${section || "genel"}`

    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
      maxOutputTokens: mode === "proaktif" ? 100 : mode === "yorum" ? 150 : mode === "detay" ? 500 : 300,
    })

    const text = result.text?.trim() || ""
    const { inputTokens, outputTokens } = extractUsage(
      result,
      `${systemPrompt}\n${message}\n${context ?? ""}`,
      text
    )
    await logTokenCost({
      memberId: (memberId as string).toLowerCase(),
      model,
      inputTokens,
      outputTokens,
    })

    if (context && text && isDuplicateAgainstContext(text, context)) {
      return NextResponse.json({ text: "PAS", model, mode: mode || "normal" })
    }

    return NextResponse.json({ text, model, mode: mode || "normal" })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("AI Chat error:", error)
    return NextResponse.json({ error: error.message || "AI yanit hatasi" }, { status: 500 })
  }
}
