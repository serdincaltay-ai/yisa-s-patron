"use client"

type Tenant = {
  id: string
  ad: string
  slug: string
  durum: string
  token_balance: number
  setup_completed: boolean
  sehir: string
  ilce: string
  telefon: string
}

type Athlete = { id: string; name?: string; surname?: string; durum?: string; ders_kredisi?: number }
type UserTenant = { id: string; user_id: string; role: string }

export default function TenantDetail({
  tenant,
  athletes_count,
  athletes_last5,
  user_tenants_count,
  user_tenants,
  kasa,
  toplam_gelir,
  attendance_count,
  kredi,
}: {
  tenant: Tenant
  athletes_count: number
  athletes_last5: Athlete[]
  user_tenants_count: number
  user_tenants: UserTenant[]
  kasa: { bu_ay_gelir: number; bu_ay_gider: number }
  toplam_gelir: number
  attendance_count: number
  kredi: { toplam_aktif: number; son_kayitlar: Athlete[] }
}) {
  return (
    <div className="space-y-6">
      {/* Tesis bilgileri */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4">Tesis Bilgileri</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-xs text-[#8892a8]">Tesis adı</span>
            <p className="text-[#e2e8f0] font-medium">{tenant.ad || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Slug</span>
            <p className="font-mono text-[#00d4ff]">{tenant.slug || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Şehir</span>
            <p className="text-[#e2e8f0]">{tenant.sehir}</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">İlçe</span>
            <p className="text-[#e2e8f0]">{tenant.ilce}</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Telefon</span>
            <p className="text-[#e2e8f0]">{tenant.telefon}</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Durum</span>
            <p>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  tenant.durum?.toLowerCase() === "aktif"
                    ? "bg-[#22c55e]/20 text-[#22c55e]"
                    : "bg-[#6b7280]/20 text-[#9ca3af]"
                }`}
              >
                {tenant.durum || "—"}
              </span>
            </p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Token bakiyesi</span>
            <p className="text-[#e2e8f0] font-medium">{tenant.token_balance}</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Kurulum</span>
            <p>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  tenant.setup_completed ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#eab308]/20 text-[#eab308]"
                }`}
              >
                {tenant.setup_completed ? "Tamamlandı" : "Bekliyor"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Sporcu listesi */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-2">Sporcular</h3>
        <p className="text-xs text-[#8892a8] mb-3">Toplam: {athletes_count} sporcu — Son 5 kayıt</p>
        <ul className="space-y-2">
          {athletes_last5.length === 0 ? (
            <li className="text-xs text-[#8892a8]">Henüz kayıt yok</li>
          ) : (
            athletes_last5.map((a) => (
              <li key={a.id} className="text-sm flex justify-between gap-2 py-1 border-b border-[#0f3460]/20">
                <span className="text-[#e2e8f0]">
                  {(a.name ?? "")} {(a.surname ?? "")}
                </span>
                <span className="text-[#8892a8] text-xs">
                  {a.ders_kredisi ?? 0} kredi · {a.durum ?? "—"}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Personel listesi */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-2">Personel</h3>
        <p className="text-xs text-[#8892a8] mb-3">Toplam: {user_tenants_count} personel</p>
        <ul className="space-y-2">
          {user_tenants.length === 0 ? (
            <li className="text-xs text-[#8892a8]">Henüz kayıt yok</li>
          ) : (
            user_tenants.map((u) => (
              <li key={u.id} className="text-sm flex justify-between gap-2 py-1 border-b border-[#0f3460]/20">
                <span className="text-[#e2e8f0] font-mono text-xs">{u.user_id?.slice(0, 8)}…</span>
                <span className="text-[#00d4ff] text-xs">{u.role ?? "—"}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Kasa özeti */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Kasa Özeti</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-xs text-[#8892a8]">Bu ay gelir</span>
            <p className="text-[#22c55e] font-medium">{kasa.bu_ay_gelir.toLocaleString("tr-TR")} ₺</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Bu ay gider</span>
            <p className="text-[#ef4444] font-medium">{kasa.bu_ay_gider.toLocaleString("tr-TR")} ₺</p>
          </div>
          <div>
            <span className="text-xs text-[#8892a8]">Toplam gelir</span>
            <p className="text-[#00d4ff] font-medium">{toplam_gelir.toLocaleString("tr-TR")} ₺</p>
          </div>
        </div>
      </div>

      {/* Yoklama özeti */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-2">Son yoklamalar</h3>
        <p className="text-xs text-[#8892a8]">Toplam yoklama kaydı: {attendance_count}</p>
      </div>

      {/* Kredi durumu */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-2">Kredi durumu</h3>
        <p className="text-xs text-[#8892a8]">Toplam aktif kredi (son 5): {kredi.toplam_aktif}</p>
        {kredi.son_kayitlar.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-[#8892a8]">
            {kredi.son_kayitlar.map((a) => (
              <li key={a.id}>
                {(a.name ?? "")} {(a.surname ?? "")} — {a.ders_kredisi ?? 0} kredi
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
