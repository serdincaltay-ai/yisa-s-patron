"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface GelirRow {
  ay: string
  gelir_tipi: string
  tutar: number
}

interface FinansData {
  rows: GelirRow[]
  toplam: number
}

export default function FinansDashboard() {
  const [data, setData] = useState<FinansData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/patron/finans")
      .then((r) => {
        if (!r.ok) throw new Error("Veri alınamadı")
        return r.json() as Promise<FinansData>
      })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-zinc-400 font-mono text-sm">Yükleniyor...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-400 font-mono text-sm">{error ?? "Veri yüklenemedi"}</p>
      </div>
    )
  }

  const rows = data.rows ?? []
  const last6 = rows.slice(0, 6).reverse()

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 font-mono tracking-tight">
        Finans Dashboard
      </h1>

      {/* Toplam Gelir Kartı */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-200 text-sm font-mono">Toplam Aylık Gelir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-zinc-100 font-mono">
            {data.toplam.toLocaleString("tr-TR")} ₺
          </p>
        </CardContent>
      </Card>

      {/* Son 6 Ay Bar Chart */}
      {last6.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-200 text-sm font-mono">Son 6 Ay Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={last6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="ay" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="tutar" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gelir Tablosu */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-200 text-sm font-mono">Son 12 Ay Gelir Detayı</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-zinc-500 text-sm font-mono">Henüz gelir kaydı yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400 font-mono">Ay</TableHead>
                  <TableHead className="text-zinc-400 font-mono">Gelir Tipi</TableHead>
                  <TableHead className="text-zinc-400 font-mono text-right">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    <TableCell className="text-zinc-200 font-mono">{row.ay}</TableCell>
                    <TableCell className="text-zinc-200">{row.gelir_tipi}</TableCell>
                    <TableCell className="text-zinc-200 font-mono text-right">
                      {row.tutar.toLocaleString("tr-TR")} ₺
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
