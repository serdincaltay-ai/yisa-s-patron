/**
 * YİSA-S Shared TypeScript Types
 * Tüm projede kullanılacak type definitions
 */

// ==================== DEMO REQUEST ====================
export interface DemoRequest {
  id?: string
  name: string
  email: string
  phone: string
  facility_type?: string
  athlete_count?: number | null
  city?: string
  notes?: string
  source?: string
  status: DemoRequestStatus
  durum?: string
  payment_status?: string
  payment_amount?: number
  payment_at?: string
  payment_notes?: string
  rejection_reason?: string
  demo_user_id?: string
  demo_expires_at?: string
  demo_started_at?: string
  created_at?: string
  updated_at?: string
}

export type DemoRequestStatus = "new" | "yeni" | "gorusuldu" | "onaylandi" | "reddedildi" | "donustu" | "iptal"

// ==================== TENANT ====================
export interface Tenant {
  id?: string
  name: string
  slug: string
  subdomain: string
  owner_email?: string
  owner_name?: string
  sablon?: string
  paket?: string
  status: TenantStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export type TenantStatus = "kurulum_bekliyor" | "aktif" | "pasif" | "askida"

// ==================== USER TENANT ====================
export interface UserTenant {
  id?: string
  user_id: string
  tenant_id: string
  role: UserRole
  created_at?: string
}

export type UserRole = "patron" | "tenant_owner" | "franchise_sahibi" | "mudur" | "coach" | "antrenor" | "veli" | "admin" | "kasa"

// ==================== STUDENT ====================
export interface Student {
  id?: string
  tenant_id: string
  name: string
  surname: string
  tc_kimlik?: string
  dogum_tarihi?: string
  cinsiyet?: string
  boy?: number
  kilo?: number
  vucut_tipi?: string
  grup_id?: string
  veli_adi?: string
  veli_telefon?: string
  veli_email?: string
  adres?: string
  saglik_notu?: string
  kan_grubu?: string
  alerji?: string
  status: StudentStatus
  created_at?: string
}

export type StudentStatus = "aktif" | "pasif" | "dondurulan"

// ==================== STAFF ====================
export interface Staff {
  id?: string
  tenant_id: string
  user_id?: string
  name: string
  surname: string
  rol?: string
  telefon?: string
  email?: string
  maas?: number
  status: StaffStatus
  created_at?: string
}

export type StaffStatus = "aktif" | "pasif"

// ==================== GROUP ====================
export interface Group {
  id?: string
  tenant_id: string
  name: string
  yas_baslangic?: number
  yas_bitis?: number
  max_ogrenci?: number
  antrenor_id?: string
  created_at?: string
}

// ==================== ATTENDANCE ====================
export interface Attendance {
  id?: string
  tenant_id: string
  athlete_id: string
  group_id?: string
  tarih: string
  status: AttendanceStatus
  antrenor_id?: string
  created_at?: string
}

export type AttendanceStatus = "katildi" | "gelmedi" | "izinli"

// ==================== PAYMENT ====================
export interface Payment {
  id?: string
  tenant_id: string
  athlete_id?: string
  amount: number
  payment_type: PaymentType
  kategori?: string
  odeme_yontemi?: string
  aciklama?: string
  makbuz_no?: string
  tarih?: string
  created_at?: string
}

export type PaymentType = "gelir" | "gider"

// ==================== SCHEDULE ====================
export interface Schedule {
  id?: string
  tenant_id: string
  group_id?: string
  gun: string
  baslangic_saat?: string
  bitis_saat?: string
  antrenor_id?: string
  created_at?: string
}

// ==================== SIM UPDATE ====================
export interface SimUpdate {
  id?: string
  decision_id?: string
  target_robot: string
  target_direktorluk?: string
  command: string
  status: SimUpdateStatus
  created_at?: string
}

export type SimUpdateStatus = "beklemede" | "islendi"

// ==================== AUDIT LOG ====================
export interface AuditLog {
  id?: string
  event_type: string
  actor_id?: string
  actor_email?: string
  tenant_id?: string
  target_table?: string
  target_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  severity: AuditLogSeverity
  created_at?: string
}

export type AuditLogSeverity = "info" | "warning" | "critical"

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    message: string
    code?: string
    statusCode: number
    details?: unknown
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  limit: number
  offset: number
}
