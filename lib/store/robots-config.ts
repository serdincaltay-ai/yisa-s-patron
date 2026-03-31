/**
 * COO Magazasi — Robot & Paket Tanimlari
 * Tenant'lar bu robotlari satin alarak is sureclerini otomatiklestirebilir.
 */

export interface RobotDefinition {
  id: string
  name: string
  slug: string
  description: string
  features: string[]
  icon: string // lucide icon name
  color: string // tailwind color key
  monthlyPrice: number // USD
  category: "muhasebe" | "ik" | "pazarlama" | "veri" | "guvenlik"
}

export interface PackageDefinition {
  id: string
  name: string
  slug: string
  description: string
  robotIds: string[]
  monthlyPrice: number // USD — indirimli paket fiyati
  savings: number // bireysel toplama gore tasarruf yuzdesi
  badge?: string // "Populer", "En Avantajli" vb.
  color: string
}

export interface CartItem {
  type: "robot" | "package"
  itemId: string
  name: string
  monthlyPrice: number
}

export interface PurchaseRecord {
  id?: string
  tenant_id: string
  item_type: "robot" | "package"
  item_id: string
  item_name: string
  monthly_price: number
  status: "active" | "cancelled" | "expired"
  purchased_at?: string
  cancelled_at?: string
}

export interface ActiveRobot {
  robot_id: string
  robot_name: string
  category: string
  status: "active" | "idle" | "working"
  task_count: number
  last_active?: string
}

// ==================== ROBOT TANIMLARI ====================

export const ROBOTS: RobotDefinition[] = [
  {
    id: "robot-muhasebe",
    name: "Muhasebe Robotu",
    slug: "muhasebe",
    description: "Gelir/gider takibi, vergi hesaplama, finansal raporlama ve fatura yonetimi.",
    features: [
      "Otomatik gelir/gider takibi",
      "Vergi hesaplama (KDV, stopaj)",
      "Aylik/yillik finansal raporlar",
      "Fatura olusturma ve takip",
      "Kasa defteri yonetimi",
    ],
    icon: "Calculator",
    color: "emerald",
    monthlyPrice: 49,
    category: "muhasebe",
  },
  {
    id: "robot-ik",
    name: "IK Robotu",
    slug: "ik",
    description: "Personel sozlesme yonetimi, izin takibi ve is kanunu uyumlulugu.",
    features: [
      "Personel sozlesme yonetimi",
      "Izin takibi ve onay surecleri",
      "Is kanunu uyumluluk kontrolu",
      "Bordro hatirlatmalari",
      "Personel performans takibi",
    ],
    icon: "Users",
    color: "blue",
    monthlyPrice: 39,
    category: "ik",
  },
  {
    id: "robot-pazarlama",
    name: "Pazarlama Robotu",
    slug: "pazarlama",
    description: "Sosyal medya icerik uretimi, Google Business yonetimi ve veli iletisimi.",
    features: [
      "Sosyal medya icerik planlama",
      "Otomatik paylasim onerisi",
      "Google Business profil yonetimi",
      "Veli bilgilendirme mesajlari",
      "Kampanya analizi",
    ],
    icon: "Megaphone",
    color: "violet",
    monthlyPrice: 44,
    category: "pazarlama",
  },
  {
    id: "robot-veri",
    name: "Veri Robotu",
    slug: "veri",
    description: "Olcum ve degerlendirme, istatistik analizi ve performans raporlama.",
    features: [
      "Sporcu olcum ve degerlendirme",
      "Istatistik ve trend analizi",
      "Performans grafikleri",
      "Karsilastirmali raporlar",
      "Veri gorsellestirme",
    ],
    icon: "BarChart3",
    color: "amber",
    monthlyPrice: 34,
    category: "veri",
  },
  {
    id: "robot-guvenlik",
    name: "Guvenlik Robotu",
    slug: "guvenlik",
    description: "Sistem izleme, denetim loglari ve guvenlik uyarilari.",
    features: [
      "Sistem erisim izleme",
      "Denetim log raporlari",
      "Anormal aktivite uyarilari",
      "Veri yedekleme kontrolu",
      "KVKK uyumluluk denetimi",
    ],
    icon: "ShieldCheck",
    color: "red",
    monthlyPrice: 29,
    category: "guvenlik",
  },
]

// ==================== PAKET TANIMLARI ====================

export const PACKAGES: PackageDefinition[] = [
  {
    id: "paket-temel",
    name: "Temel Paket",
    slug: "temel",
    description: "Muhasebe + Veri robotlari ile temel isletme yonetimi.",
    robotIds: ["robot-muhasebe", "robot-veri"],
    monthlyPrice: 69,
    savings: 17,
    color: "cyan",
  },
  {
    id: "paket-standart",
    name: "Standart Paket",
    slug: "standart",
    description: "Temel paket + IK + Pazarlama robotlari. En populer secim.",
    robotIds: ["robot-muhasebe", "robot-veri", "robot-ik", "robot-pazarlama"],
    monthlyPrice: 129,
    savings: 22,
    badge: "Populer",
    color: "indigo",
  },
  {
    id: "paket-premium",
    name: "Premium Paket",
    slug: "premium",
    description: "Tum robotlar dahil — tam otomasyon. En avantajli fiyat.",
    robotIds: ["robot-muhasebe", "robot-veri", "robot-ik", "robot-pazarlama", "robot-guvenlik"],
    monthlyPrice: 149,
    savings: 24,
    badge: "En Avantajli",
    color: "amber",
  },
]

// ==================== YARDIMCI FONKSIYONLAR ====================

export function getRobotById(id: string): RobotDefinition | undefined {
  return ROBOTS.find((r) => r.id === id)
}

export function getPackageById(id: string): PackageDefinition | undefined {
  return PACKAGES.find((p) => p.id === id)
}

export function getRobotsForPackage(packageId: string): RobotDefinition[] {
  const pkg = getPackageById(packageId)
  if (!pkg) return []
  return pkg.robotIds
    .map((rid) => getRobotById(rid))
    .filter((r): r is RobotDefinition => r !== undefined)
}

export function calculateIndividualTotal(robotIds: string[]): number {
  return robotIds.reduce((total, id) => {
    const robot = getRobotById(id)
    return total + (robot?.monthlyPrice ?? 0)
  }, 0)
}
