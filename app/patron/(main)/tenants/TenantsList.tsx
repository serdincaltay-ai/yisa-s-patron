"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

type Tenant = {
  id: string
  ad: string
  slug: string
  durum: string
  token_balance: number
  setup_completed: boolean
  sporcu_sayisi: number
  personel_sayisi: number
  toplam_gelir: number
}

type Summary = {
  toplam_tenant: number
  aktif_tenant: number
  toplam_sporcu: number
  toplam_gelir: number
}

/** #21: Tenant URL'ini oluştur */
function getTenantUrl(slug: string): string {
  if (!slug) return ""
  return `https://${slug}.yisa-s.com`
}

export default function TenantsList({ tenants, summary }: { tenants: Tenant[]; summary: Summary }) {
  return (
    <div className="space-y-6">
      {/* Özet kartları */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Toplam Franchise</div>
          <div className="text-2xl font-bold text-[#e2e8f0]">{summary.toplam_tenant}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Aktif Franchise</div>
          <div className="text-2xl font-bold text-[#22c55e]">{summary.aktif_tenant}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Toplam Sporcu</div>
          <div className="text-2xl font-bold text-[#e2e8f0]">{summary.toplam_sporcu}</div>
        </div>
        <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4">
          <div className="text-xs text-[#8892a8]">Toplam Gelir</div>
          <div className="text-2xl font-bold text-[#00d4ff]">
            {summary.toplam_gelir.toLocaleString("tr-TR")} ₺
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#0f3460]/40 bg-[#0f3460]/10">
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Tesis Adı</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Slug</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Durum</th>
                <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">Sporcu</th>
                <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">Personel</th>
                <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">Token</th>
                <th className="text-left py-3 px-4 font-medium text-[#00d4ff]">Kurulum</th>
                <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">Gelir</th>
                <th className="text-right py-3 px-4 font-medium text-[#00d4ff]">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#8892a8]">
                    Henüz tenant yok
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[#0f3460]/20 hover:bg-[#0f3460]/5"
                  >
                    <td className="py-3 px-4 text-[#e2e8f0] font-medium">{t.ad || "—"}</td>
                    <td className="py-3 px-4">
                      {t.slug ? (
                        <a
                          href={getTenantUrl(t.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00d4ff] hover:underline font-mono text-xs"
                        >
                          {t.slug}.yisa-s.com
                        </a>
                      ) : (
                        <span className="text-[#8892a8] font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          (t.durum ?? "").toString().toLowerCase() === "aktif"
                            ? "bg-[#22c55e]/20 text-[#22c55e]"
                            : "bg-[#6b7280]/20 text-[#9ca3af]"
                        }`}
                      >
                        {t.durum || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#e2e8f0]">{t.sporcu_sayisi}</td>
                    <td className="py-3 px-4 text-right text-[#e2e8f0]">{t.personel_sayisi}</td>
                    <td className="py-3 px-4 text-right text-[#8892a8]">{t.token_balance}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          t.setup_completed ? "bg-[#22c55e]/20 text-[#22c55e]" : "bg-[#eab308]/20 text-[#eab308]"
                        }`}
                      >
                        {t.setup_completed ? "Tamam" : "Bekliyor"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#8892a8]">
                      {t.toplam_gelir.toLocaleString("tr-TR")} ₺
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/patron/tenants/${t.id}`}>
                        <Button
                          size="sm"
                          className="bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
                        >
                          Detay
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
