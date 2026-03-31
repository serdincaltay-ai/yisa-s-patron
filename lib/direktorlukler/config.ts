import type { LucideIcon } from "lucide-react"
import {
  Scale,
  Wallet,
  Settings,
  Palette,
  Megaphone,
  Users,
  FlaskConical,
  ShieldCheck,
  BarChart3,
  Activity,
  Handshake,
  Target,
} from "lucide-react"

export interface DirectorateConfig {
  slug: string
  code: string
  name: string
  shortName: string
  icon: LucideIcon
  neonColor: string
  description: string
}

export const DIREKTORLUKLER: DirectorateConfig[] = [
  { slug: "hukuk", code: "CLO", name: "Hukuk Direktorlugu", shortName: "Hukuk", icon: Scale, neonColor: "#e94560", description: "Hukuk, KVKK, sozlesme, mevzuat uyumu" },
  { slug: "muhasebe", code: "CFO", name: "Muhasebe Direktorlugu", shortName: "Muhasebe", icon: Wallet, neonColor: "#00d4ff", description: "Butce, maliyet, fiyatlama, token takibi" },
  { slug: "teknik", code: "CTO", name: "Teknik Direktorlugu", shortName: "Teknik", icon: Settings, neonColor: "#00d4ff", description: "Kod, mimari, API, deployment" },
  { slug: "tasarim", code: "CPO", name: "Tasarim Direktorlugu", shortName: "Tasarim", icon: Palette, neonColor: "#e94560", description: "Urun tasarimi, UI/UX, ekran deneyimi" },
  { slug: "pazarlama", code: "CMO", name: "Pazarlama Direktorlugu", shortName: "Pazarlama", icon: Megaphone, neonColor: "#00d4ff", description: "Pazarlama, icerik, reklam, iletisim" },
  { slug: "ik", code: "CHRO", name: "İnsan Kaynakları", shortName: "İK", icon: Users, neonColor: "#e94560", description: "Personel, eğitim, performans" },
  { slug: "arge", code: "CRDO", name: "AR-GE Direktorlugu", shortName: "AR-GE", icon: FlaskConical, neonColor: "#00d4ff", description: "Arastirma, yenilik, urun gelistirme" },
  { slug: "guvenlik", code: "CISO", name: "Guvenlik Direktorlugu", shortName: "Guvenlik", icon: ShieldCheck, neonColor: "#ffa500", description: "Siber guvenlik, erisim kontrolu" },
  { slug: "veri", code: "CDO", name: "Veri Direktorlugu", shortName: "Veri", icon: BarChart3, neonColor: "#00d4ff", description: "Veri yonetimi, analitik, raporlama" },
  { slug: "operasyon", code: "CSPO", name: "Sportif Performans Direktorlugu", shortName: "Sportif", icon: Activity, neonColor: "#e94560", description: "Sporcu gelisimi, antrenman, program yonetimi" },
  { slug: "musteri", code: "CCO", name: "Musteri Iliskileri", shortName: "Musteri", icon: Handshake, neonColor: "#00d4ff", description: "Musteri deneyimi, destek, operasyon iletisim" },
  { slug: "strateji", code: "CSO", name: "Strateji Direktorlugu", shortName: "Strateji", icon: Target, neonColor: "#e94560", description: "Vizyon, buyume, rekabet analizi" },
]

export function getDirectorateBySlug(slug: string): DirectorateConfig | undefined {
  return DIREKTORLUKLER.find((d) => d.slug === slug)
}

/** Map a Turkish slug to the C-suite code used in the DB CHECK constraint */
export function slugToCode(slug: string): string | undefined {
  return DIREKTORLUKLER.find((d) => d.slug === slug)?.code
}
