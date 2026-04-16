"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Cpu,
  BarChart3,
  AlertTriangle,
} from "lucide-react"

// ==================== TYPES ====================

interface KasaSummary {
  gelir: {
    toplam: number
    demo: number
    abonelik: number
    aktivasyonUsd: number
    aktivasyonAdet: number
    tenantBazli: { tenantId: string; name: string; total: number }[]
  }
  gider: {
    toplam: number
    apiMaliyeti: number
    ajanBazli: { memberId: string; cost: number }[]
    hosting: { vercel: number; supabase: number; toplam: number }
    toplamIsletme: number
    fixed: {
      total: number
      upcomingCount: number
      overdueCount: number
      items: {
        id: string
        dueDate: string
        daysLeft: number
        amount: number
        category: string | null
        vendor: string | null
        status: string
      }[]
    }
  }
  dailyData: { date: string; gelir: number; gider: number }[]
  monthlyReport: {
    month: string
    label: string
    gelir: number
    gider: number
    net: number
    aktivasyonUsd: number
    aktivasyonAdet: number
  }[]
  pendingCount: number
}

interface TokenAgent {
  memberId: string
  name: string
  color: string
  totalTokens: number
  costUsd: number
  thisMonthTokens: number
  thisMonthCost: number
  trend: number
  lastUsed: string | null
}

interface TokenData {
  agents: TokenAgent[]
  totalCost: number
  thisMonthTotal: number
}

function formatTL(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " TL"
}

function formatUSD(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

// ==================== MAIN COMPONENT ====================

export default function KasaDashboard() {
  const [summary, setSummary] = useState<KasaSummary | null>(null)
  const [tokens, setTokens] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const [summaryRes, tokenRes] = await Promise.all([
          fetch("/api/kasa/summary"),
          fetch("/api/kasa/token-costs"),
        ])

        const summaryPayload = await summaryRes.json().catch(() => ({}))
        const tokenPayload = await tokenRes.json().catch(() => ({}))

        if (!summaryRes.ok) {
          throw new Error(
            typeof summaryPayload?.error === "string"
              ? summaryPayload.error
              : "Kasa ozet verisi yuklenemedi"
          )
        }
        if (!tokenRes.ok) {
          throw new Error(
            typeof tokenPayload?.error === "string"
              ? tokenPayload.error
              : "Token maliyet verisi yuklenemedi"
          )
        }

        setSummary(summaryPayload)
        setTokens(tokenPayload)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Finans verisi yuklenemedi")
      } finally {
        setLoading(false)
      }
    }

    fetchFinanceData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#8892a8] font-mono text-sm">Yukleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400 font-mono text-sm">{error}</p>
      </div>
    )
  }

  const gelir = summary?.gelir ?? { toplam: 0, demo: 0, abonelik: 0, aktivasyonUsd: 0, aktivasyonAdet: 0, tenantBazli: [] }
  const gider = summary?.gider ?? { toplam: 0, apiMaliyeti: 0, ajanBazli: [], hosting: { vercel: 0, supabase: 0, toplam: 0 }, toplamIsletme: 0, fixed: { total: 0, upcomingCount: 0, overdueCount: 0, items: [] } }
  const dailyData = summary?.dailyData ?? []
  const monthlyReport = summary?.monthlyReport ?? []
  const karMarji = gelir.toplam - gider.toplamIsletme
  const karYuzdesi = gelir.toplam > 0 ? Math.round((karMarji / gelir.toplam) * 100) : 0

  const topCards = [
    { label: "Toplam Gelir", value: formatTL(gelir.toplam), icon: TrendingUp, color: "#22c55e" },
    { label: "Toplam Gider", value: formatTL(gider.toplamIsletme), icon: TrendingDown, color: "#ef4444" },
    { label: "Kar Marji", value: formatTL(karMarji), sub: `%${karYuzdesi}`, icon: DollarSign, color: karMarji >= 0 ? "#00d4ff" : "#ef4444" },
    { label: "API Maliyeti", value: formatUSD(gider.apiMaliyeti), icon: Cpu, color: "#f59e0b" },
    { label: "Aktivasyon Geliri", value: formatUSD(gelir.aktivasyonUsd), sub: `${gelir.aktivasyonAdet} kayit`, icon: CreditCard, color: "#a78bfa" },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#00d4ff]" />
          Kasa
        </h2>
        <p className="text-sm text-[#8892a8] mt-1">
          Gelir, gider, token harcamasi, kar marji ve finansal grafikler.
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {topCards.map((c) => (
          <Card key={c.label} className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color + "15", color: c.color }}>
                  <c.icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-[#8892a8]">{c.label}</span>
              </div>
              <p className="text-lg font-bold text-[#e2e8f0] font-mono">{c.value}</p>
              {c.sub && <p className="text-xs font-mono" style={{ color: c.color }}>{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="bg-[#0f3460]/20 border border-[#0f3460]/40">
          <TabsTrigger value="genel" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">Genel</TabsTrigger>
          <TabsTrigger value="token" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">Token Maliyetleri</TabsTrigger>
          <TabsTrigger value="faturalar" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">Faturalar</TabsTrigger>
        </TabsList>

        {/* GENEL TAB */}
        <TabsContent value="genel" className="space-y-4 mt-4">
          {/* Daily Gelir/Gider Chart */}
          {dailyData.length > 0 && (
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardHeader>
                <CardTitle className="text-[#e2e8f0] text-sm">Son 30 Gun — Gelir vs Gider</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0a0e17", border: "1px solid #2a3650", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }}
                      formatter={(value: number, name: string) => [formatTL(value), name === "gelir" ? "Gelir" : "Gider"]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="gelir" stroke="#22c55e" strokeWidth={2} dot={false} name="Gelir" />
                    <Line type="monotone" dataKey="gider" stroke="#ef4444" strokeWidth={2} dot={false} name="Gider" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {monthlyReport.length > 0 && (
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardHeader>
                <CardTitle className="text-[#e2e8f0] text-sm">Aylik Finans Raporu (Son 6 Ay)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyReport}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0a0e17", border: "1px solid #2a3650", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }}
                      formatter={(value: number, name: string) => {
                        if (name === "aktivasyonUsd") return [formatUSD(value), "Aktivasyon (USD)"]
                        return [formatTL(value), name === "gelir" ? "Gelir" : name === "gider" ? "Gider" : "Net"]
                      }}
                    />
                    <Legend />
                    <Bar dataKey="gelir" fill="#22c55e" radius={[3, 3, 0, 0]} name="Gelir" />
                    <Bar dataKey="gider" fill="#ef4444" radius={[3, 3, 0, 0]} name="Gider" />
                    <Bar dataKey="net" fill="#00d4ff" radius={[3, 3, 0, 0]} name="Net" />
                  </BarChart>
                </ResponsiveContainer>

                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a3650]">
                      <TableHead className="text-[#8892a8]">Ay</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Gelir</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Gider</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Net</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Aktivasyon</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyReport.map((row) => (
                      <TableRow key={row.month} className="border-[#2a3650]/60">
                        <TableCell className="text-[#e2e8f0]">{row.label}</TableCell>
                        <TableCell className="text-right text-[#22c55e] font-mono">{formatTL(row.gelir)}</TableCell>
                        <TableCell className="text-right text-[#ef4444] font-mono">{formatTL(row.gider)}</TableCell>
                        <TableCell className={`text-right font-mono ${row.net >= 0 ? "text-[#00d4ff]" : "text-[#ef4444]"}`}>
                          {formatTL(row.net)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#a78bfa]">
                          {formatUSD(row.aktivasyonUsd)} ({row.aktivasyonAdet})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Gelir Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardHeader>
                <CardTitle className="text-[#e2e8f0] text-sm">Gelir Dagilimi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: "Demo", tutar: gelir.demo },
                    { name: "Abonelik", tutar: gelir.abonelik },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0a0e17", border: "1px solid #2a3650", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="tutar" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardHeader>
                <CardTitle className="text-[#e2e8f0] text-sm">Gider Dagilimi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: "Isletme", tutar: gider.toplam },
                    { name: "API", tutar: gider.apiMaliyeti * 34 },
                    { name: "Hosting", tutar: gider.hosting.toplam * 34 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0a0e17", border: "1px solid #2a3650", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="tutar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tenant bazli gelir */}
          {gelir.tenantBazli.length > 0 && (
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardHeader>
                <CardTitle className="text-[#e2e8f0] text-sm">Tenant Bazli Gelir</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a3650]">
                      <TableHead className="text-[#8892a8]">Tenant</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Gelir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gelir.tenantBazli.slice(0, 10).map((t) => (
                      <TableRow key={t.tenantId} className="border-[#2a3650]/60">
                        <TableCell className="text-[#e2e8f0]">{t.name}</TableCell>
                        <TableCell className="text-[#22c55e] font-mono text-right">{formatTL(t.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TOKEN TAB */}
        <TabsContent value="token" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892a8]">Toplam API Maliyeti</p>
                <p className="text-xl font-bold text-[#e2e8f0] font-mono">{formatUSD(tokens?.totalCost ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892a8]">Bu Ay</p>
                <p className="text-xl font-bold text-[#f59e0b] font-mono">{formatUSD(tokens?.thisMonthTotal ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-[#2a3650] bg-[#0a0e17]/90">
              <CardContent className="p-4">
                <p className="text-xs text-[#8892a8]">Aktif Ajan</p>
                <p className="text-xl font-bold text-[#00d4ff] font-mono">{tokens?.agents?.filter((a) => a.thisMonthCost > 0).length ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Agent cost table */}
          <Card className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardHeader>
              <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#f59e0b]" />
                Ajan Bazli Token Maliyetleri
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(tokens?.agents ?? []).length === 0 ? (
                <p className="text-sm text-[#8892a8]">Henuz token kullanimi yok.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a3650]">
                      <TableHead className="text-[#8892a8]">Ajan</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Token</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Maliyet</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Bu Ay</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tokens?.agents ?? []).map((a) => (
                      <TableRow key={a.memberId} className="border-[#2a3650]/60">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                            <span className="text-[#e2e8f0]">{a.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#8892a8] font-mono text-right">{a.totalTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-[#e2e8f0] font-mono text-right">{formatUSD(a.costUsd)}</TableCell>
                        <TableCell className="text-[#f59e0b] font-mono text-right">{formatUSD(a.thisMonthCost)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs font-mono ${a.trend > 0 ? "text-[#ef4444]" : a.trend < 0 ? "text-[#22c55e]" : "text-[#8892a8]"}`}>
                            {a.trend > 0 ? "+" : ""}{a.trend}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Hosting costs */}
          <Card className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardHeader>
              <CardTitle className="text-[#e2e8f0] text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#00d4ff]" />
                Hosting Maliyetleri (Aylik)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-[#8892a8]">Vercel</p>
                  <p className="text-lg font-bold text-[#e2e8f0] font-mono">{formatUSD(gider.hosting.vercel)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#8892a8]">Supabase</p>
                  <p className="text-lg font-bold text-[#e2e8f0] font-mono">{formatUSD(gider.hosting.supabase)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#8892a8]">Toplam</p>
                  <p className="text-lg font-bold text-[#00d4ff] font-mono">{formatUSD(gider.hosting.toplam)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FATURALAR TAB */}
        <TabsContent value="faturalar" className="space-y-4 mt-4">
          {gider.fixed.overdueCount > 0 && (
            <Card className="border-[#ef4444]/40 bg-[#ef4444]/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                <p className="text-sm text-[#ef4444]">{gider.fixed.overdueCount} adet gecmis vadeli fatura var!</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-[#2a3650] bg-[#0a0e17]/90">
            <CardHeader>
              <CardTitle className="text-[#e2e8f0] text-sm">Sabit Gider / Fatura Takibi ({gider.fixed.total} kayit)</CardTitle>
            </CardHeader>
            <CardContent>
              {gider.fixed.items.length === 0 ? (
                <p className="text-sm text-[#8892a8]">Henuz sabit gider kaydedilmemis.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#2a3650]">
                      <TableHead className="text-[#8892a8]">Vade</TableHead>
                      <TableHead className="text-[#8892a8]">Kategori</TableHead>
                      <TableHead className="text-[#8892a8]">Firma</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Tutar</TableHead>
                      <TableHead className="text-[#8892a8] text-right">Gun</TableHead>
                      <TableHead className="text-[#8892a8]">Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gider.fixed.items.map((item) => (
                      <TableRow key={item.id} className="border-[#2a3650]/60">
                        <TableCell className="text-[#e2e8f0] font-mono text-sm">{item.dueDate}</TableCell>
                        <TableCell className="text-[#8892a8] text-sm">{item.category ?? "—"}</TableCell>
                        <TableCell className="text-[#8892a8] text-sm">{item.vendor ?? "—"}</TableCell>
                        <TableCell className="text-[#e2e8f0] font-mono text-right text-sm">{formatTL(item.amount)}</TableCell>
                        <TableCell className={`font-mono text-right text-sm ${item.daysLeft < 0 ? "text-[#ef4444]" : item.daysLeft <= 7 ? "text-[#f59e0b]" : "text-[#8892a8]"}`}>
                          {item.daysLeft}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            item.status === "overdue" ? "bg-[#ef4444]/20 text-[#ef4444]" :
                            item.status === "upcoming" ? "bg-[#f59e0b]/20 text-[#f59e0b]" :
                            "bg-[#22c55e]/20 text-[#22c55e]"
                          }`}>
                            {item.status === "overdue" ? "Gecmis" : item.status === "upcoming" ? "Yaklasan" : "Normal"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
