import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    // Simple response logic - can be enhanced with AI later
    let reply = "Anladim, bu konuda yardimci olabilirim."

    const lower = message?.toLowerCase() || ""

    if (lower.includes("yoklama") || lower.includes("devamsizlik")) {
      reply = "Yoklama takibi icin Antrenör panelinden gunluk yoklama girebilirsiniz. Detayli raporlar Patron panelinde mevcuttur."
    } else if (lower.includes("aidat") || lower.includes("odeme")) {
      reply = "Aidat yonetimi icin Kasa Defteri sayfasini kullanabilirsiniz. Odenmemis aidatlar icin otomatik hatirlatma gonderilir."
    } else if (lower.includes("rapor") || lower.includes("istatistik")) {
      reply = "Detayli istatistikler Patron panelindeki Istatistik sayfasinda bulunmaktadir. Haftalik, aylik ve yillik raporlar mevcuttur."
    } else if (lower.includes("gorev") || lower.includes("celf")) {
      reply = "CELF sistemi uzerinden 12 direktorluge gorev atayabilirsiniz. Patron panelindeki CELF sayfasini kullanin."
    } else if (lower.includes("robot") || lower.includes("beyin")) {
      reply = "Beyin Takimi 4 robottan olusur: CELF (görev), Veri (analiz), Güvenlik (log), YISA-S (genel). Her biri farkli görevleri ustelenrir."
    } else if (lower.includes("kredi") || lower.includes("paket")) {
      reply = "Kredi sistemi: Starter 100 kredi/499TL, Pro 500 kredi/999TL, Enterprise 2000+ kredi. Temel islemler (yoklama, aidat) ucretsiz."
    } else if (lower.includes("merhaba") || lower.includes("selam") || lower.includes("hosgeldin")) {
      reply = "Merhaba! YISA-S robot asistaniyim. Yoklama, aidat, rapor, gorev yonetimi ve daha fazlasi hakkinda sorularinizi yanitlayabilirim."
    }

    return NextResponse.json({ reply, ok: true })
  } catch {
    return NextResponse.json({ reply: "Bir hata olustu.", ok: false }, { status: 500 })
  }
}
