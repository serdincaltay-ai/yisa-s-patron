import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * Sablon Magazasi API
 * GET: Magaza sablonlarini listele (filtre + sayfalama)
 * POST: Sablon yukle / satin al / piyasa robotu ile ekle
 */

// Magaza sablonlari icin sabit veri (DB tablosu eklenene kadar)
const STORE_TEMPLATES = [
  // Tesis Yonetim
  {
    id: "store-1",
    name: "Spor Salonu Yonetim Paketi",
    description: "Spor salonu isletmeleri icin eksiksiz yonetim sablonu. Uye takibi, ders programi, ekipman envanteri ve finansal raporlama icin hazir moduller.",
    category: "tesis_yonetim",
    price: 0,
    currency: "TRY",
    stars: 4.8,
    downloads: 1250,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["spor", "salon", "uye", "envanter"],
    features: ["Uye kayit ve takip", "Ders programi olusturma", "Ekipman envanter yonetimi", "Aylik gelir/gider raporu", "Antrenor atama sistemi"],
    is_free: true,
    is_official: true,
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "store-2",
    name: "Yuzme Havuzu Isletme Sablonu",
    description: "Yuzme havuzu tesisleri icin ozel tasarlanmis sablon. Havuz bakim takibi, kurs yonetimi ve mevsimsel planlama araclari.",
    category: "tesis_yonetim",
    price: 0,
    currency: "TRY",
    stars: 4.5,
    downloads: 830,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["yuzme", "havuz", "kurs", "bakim"],
    features: ["Havuz bakim takvimi", "Kurs kayit sistemi", "Su kalitesi takip", "Mevsimsel fiyatlama", "Ogrenci ilerleme raporu"],
    is_free: true,
    is_official: true,
    created_at: "2026-01-20T10:00:00Z",
  },
  {
    id: "store-3",
    name: "Basketbol Akademisi Pro",
    description: "Basketbol akademileri icin profesyonel yonetim sablonu. Sporcu performans takibi, mac istatistikleri ve transfer yonetimi.",
    category: "tesis_yonetim",
    price: 299,
    currency: "TRY",
    stars: 4.9,
    downloads: 2100,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["basketbol", "akademi", "performans", "istatistik"],
    features: ["Sporcu performans analizi", "Mac istatistik modulu", "Transfer takip sistemi", "Video analiz entegrasyonu", "Velilere otomatik rapor"],
    is_free: false,
    is_official: true,
    created_at: "2026-02-01T10:00:00Z",
  },
  // Web Sitesi
  {
    id: "store-4",
    name: "Modern Spor Kulubu Web Sitesi",
    description: "Responsive tasarimli modern spor kulubu web sitesi sablonu. Hero section, hizmetler, galeri, iletisim formu ve online kayit modulleri.",
    category: "web_sitesi",
    price: 0,
    currency: "TRY",
    stars: 4.7,
    downloads: 3400,
    author: "Topluluk",
    preview_url: null,
    tags: ["web", "responsive", "modern", "kayit"],
    features: ["Responsive tasarim", "Online kayit formu", "Galeri modulu", "Blog/Haber bolumu", "SEO optimizasyonu"],
    is_free: true,
    is_official: false,
    created_at: "2026-01-10T10:00:00Z",
  },
  {
    id: "store-5",
    name: "Franchise Tanitim Sayfasi",
    description: "Franchise sahipleri icin profesyonel tanitim sayfasi. Sube bilgileri, antrenor kadrosu ve basari hikayeleri icin hazir bilesenler.",
    category: "web_sitesi",
    price: 149,
    currency: "TRY",
    stars: 4.3,
    downloads: 980,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["franchise", "tanitim", "sube", "landing"],
    features: ["Sube bilgi karti", "Antrenor profilleri", "Basari hikayeleri slider", "Google Maps entegrasyonu", "WhatsApp iletisim butonu"],
    is_free: false,
    is_official: true,
    created_at: "2026-02-05T10:00:00Z",
  },
  // Vitrin
  {
    id: "store-6",
    name: "Dijital Vitrin Starter",
    description: "Dijital vitrin icin baslangic sablonu. Hizmet listeleme, fiyatlandirma tablosu ve musteri yorumlari modulleri.",
    category: "vitrin",
    price: 0,
    currency: "TRY",
    stars: 4.6,
    downloads: 1800,
    author: "Topluluk",
    preview_url: null,
    tags: ["vitrin", "fiyat", "hizmet", "yorum"],
    features: ["Hizmet listeleme", "Fiyat karsilastirma tablosu", "Musteri yorumlari", "Sosyal medya entegrasyonu", "Duyuru banner alani"],
    is_free: true,
    is_official: false,
    created_at: "2026-01-25T10:00:00Z",
  },
  // Muhasebe
  {
    id: "store-7",
    name: "Temel Muhasebe Sablonu",
    description: "Kucuk isletmeler icin temel muhasebe sablonu. Gelir/gider takibi, fatura olusturma ve vergi hesaplama araclari.",
    category: "muhasebe",
    price: 0,
    currency: "TRY",
    stars: 4.4,
    downloads: 2650,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["muhasebe", "fatura", "vergi", "gelir", "gider"],
    features: ["Gelir/gider kaydi", "Otomatik fatura olusturma", "KDV hesaplama", "Aylik mali rapor", "Excel export"],
    is_free: true,
    is_official: true,
    created_at: "2026-01-12T10:00:00Z",
  },
  {
    id: "store-8",
    name: "Ileri Muhasebe ve Finans",
    description: "Coklu sube isletmeleri icin ileri muhasebe sablonu. Konsolide raporlar, butce planlama ve nakit akim analizi.",
    category: "muhasebe",
    price: 499,
    currency: "TRY",
    stars: 4.9,
    downloads: 720,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["muhasebe", "finans", "butce", "konsolide"],
    features: ["Konsolide raporlama", "Butce planlama araci", "Nakit akim analizi", "Coklu doviz destegi", "Otomatik mutabakat"],
    is_free: false,
    is_official: true,
    created_at: "2026-02-10T10:00:00Z",
  },
  // IK
  {
    id: "store-9",
    name: "IK Yonetim Baslangic Paketi",
    description: "Insan kaynaklari yonetimi icin baslangic sablonu. Personel ozluk dosyasi, izin takibi ve performans degerlendirme modulleri.",
    category: "ik",
    price: 0,
    currency: "TRY",
    stars: 4.5,
    downloads: 1950,
    author: "Topluluk",
    preview_url: null,
    tags: ["ik", "personel", "izin", "performans"],
    features: ["Personel ozluk dosyasi", "Izin talep ve onay sistemi", "Performans degerlendirme formu", "Egitim takip modulu", "Bordro entegrasyonu"],
    is_free: true,
    is_official: false,
    created_at: "2026-01-18T10:00:00Z",
  },
  {
    id: "store-10",
    name: "Antrenor ve Personel Pro",
    description: "Spor tesisleri icin antrenor ve personel yonetim sablonu. Sertifika takibi, vardiya planlama ve prim hesaplama.",
    category: "ik",
    price: 199,
    currency: "TRY",
    stars: 4.6,
    downloads: 560,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["antrenor", "personel", "sertifika", "vardiya"],
    features: ["Sertifika ve lisans takibi", "Vardiya planlama", "Prim hesaplama sistemi", "Antrenor performans raporu", "Otomatik bildirimler"],
    is_free: false,
    is_official: true,
    created_at: "2026-02-15T10:00:00Z",
  },
  // Pazarlama
  {
    id: "store-11",
    name: "Sosyal Medya Pazarlama Kiti",
    description: "Spor tesisleri icin sosyal medya pazarlama sablonu. Icerik takvimi, post sablonlari ve analitik paneli.",
    category: "pazarlama",
    price: 0,
    currency: "TRY",
    stars: 4.3,
    downloads: 3100,
    author: "Topluluk",
    preview_url: null,
    tags: ["pazarlama", "sosyal medya", "icerik", "analitik"],
    features: ["Icerik takvimi", "Hazir post sablonlari", "Hashtag onerileri", "Performans analitik paneli", "Rakip analizi araci"],
    is_free: true,
    is_official: false,
    created_at: "2026-01-22T10:00:00Z",
  },
  {
    id: "store-12",
    name: "Email ve SMS Kampanya Yoneticisi",
    description: "Toplu email ve SMS kampanyalari icin yonetim sablonu. Sablon editoru, A/B test ve otomasyon kurallari.",
    category: "pazarlama",
    price: 349,
    currency: "TRY",
    stars: 4.7,
    downloads: 890,
    author: "YiSA-S Resmi",
    preview_url: null,
    tags: ["email", "sms", "kampanya", "otomasyon"],
    features: ["Drag & drop sablon editoru", "A/B test modulu", "Otomasyon kurallari", "Segmentasyon araclari", "Detayli kampanya raporu"],
    is_free: false,
    is_official: true,
    created_at: "2026-02-20T10:00:00Z",
  },
]

export type StoreTemplate = (typeof STORE_TEMPLATES)[number]

function mapCategoryToTemplateType(category: string): "rapor" | "dashboard" | "ui" | "email" | "bildirim" {
  if (category === "muhasebe") return "dashboard"
  if (category === "pazarlama") return "bildirim"
  if (category === "ik") return "rapor"
  return "ui"
}

function buildTemplateContent(template: StoreTemplate): string {
  return [
    template.name,
    "",
    template.description,
    "",
    "Ozellikler:",
    ...template.features.map((f) => `- ${f}`),
  ].join("\n")
}

export async function GET(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const search = searchParams.get("search")
  const priceFilter = searchParams.get("price") // "free" | "paid" | null
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  let filtered = [...STORE_TEMPLATES]

  if (category && category !== "all") {
    filtered = filtered.filter((t) => t.category === category)
  }

  if (priceFilter === "free") {
    filtered = filtered.filter((t) => t.is_free)
  } else if (priceFilter === "paid") {
    filtered = filtered.filter((t) => !t.is_free)
  }

  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
    )
  }

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  return NextResponse.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girisi gerekli" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { action, template_id, robot_query } = body

  // Sablon yukle/kopyala
  if (action === "install") {
    const template = STORE_TEMPLATES.find((t) => t.id === template_id)
    if (!template) {
      return NextResponse.json({ error: "Sablon bulunamadi" }, { status: 404 })
    }

    // Ucretli sablonlar icin odeme kontrolu (henuz odeme sistemi entegre degil)
    if (!template.is_free) {
      return NextResponse.json(
        { error: "Bu sablon ucretlidir. Satin alma islemi henuz aktif degil." },
        { status: 402 }
      )
    }

    // Sablonu ceo_templates'e kopyala (sablon havuzunun source-of-truth tablosu)
    const supabase = createAdminClient()
    const templateName = `${template.name} [Store:${template.id}]`

    const { data: existing } = await supabase
      .from("ceo_templates")
      .select("id")
      .eq("template_name", templateName)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({
        success: true,
        message: `"${template.name}" daha once yuklenmis`,
        data: existing,
      })
    }

    const { data, error } = await supabase
      .from("ceo_templates")
      .insert({
        template_name: templateName,
        template_type: mapCategoryToTemplateType(template.category),
        director_key: null,
        content: { plan: buildTemplateContent(template), source: "template_store" },
        variables: [],
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

    return NextResponse.json({
      success: true,
      message: `"${template.name}" basariyla yuklendi`,
      data,
    })
  }

  // Piyasa robotu: ucretsiz sablon ara
  if (action === "robot_search") {
    if (!robot_query) {
      return NextResponse.json({ error: "robot_query gerekli" }, { status: 400 })
    }

    // Piyasa robotu simuasyonu: query'ye gore ucretsiz sablonlari filtrele ve AI oneri uret
    const q = (robot_query as string).toLowerCase()
    const suggestions = STORE_TEMPLATES.filter(
      (t) =>
        t.is_free &&
        (t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)) ||
          t.category.includes(q))
    )

    return NextResponse.json({
      success: true,
      query: robot_query,
      results: suggestions,
      robot_message: suggestions.length > 0
        ? `"${robot_query}" icin ${suggestions.length} ucretsiz sablon bulundu. Hemen yukleyebilirsiniz.`
        : `"${robot_query}" icin ucretsiz sablon bulunamadi. Farkli anahtar kelimeler deneyin.`,
    })
  }

  return NextResponse.json({ error: "Gecersiz action. 'install' veya 'robot_search' kullanin." }, { status: 400 })
}
