"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Expense = {
  id: string
  amount: number
  category: string | null
  description: string | null
  expense_date: string
  type: string
  is_fixed?: boolean
  billing_period?: "monthly" | "quarterly" | "yearly" | "one_time" | null
  next_due_date?: string | null
  reminder_days_before?: number | null
  is_active?: boolean | null
  vendor?: string | null
  invoice_ref?: string | null
}

export default function KasaDefteriPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ totalGelir: 0, totalGider: 0 })
  const [form, setForm] = useState({
    type: "gider",
    amount: "",
    category: "",
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
    is_fixed: false,
    billing_period: "monthly",
    next_due_date: "",
    reminder_days_before: "7",
    is_active: true,
    vendor: "",
    invoice_ref: "",
  })
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const loadExpenses = () => {
    // #23: Hem expenses hem payments tablosundan veri çek
    Promise.all([
      fetch("/api/expenses?limit=100").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/kasa/payments").then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([expensesRes, paymentsRes]) => {
      const expenseItems: Expense[] = expensesRes.data || []
      const paymentItems = (paymentsRes.data || []) as Array<{
        id: string; amount: number; status: string; created_at: string; description?: string
      }>

      // Payments tablosundaki onaylanmış ödemeler = gelir olarak say
      const paymentAsExpense: Expense[] = paymentItems
        .filter((p) => p.status === "paid" || p.status === "onaylandi")
        .map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        category: "Ödeme",
        description: p.description || "Aidat/ödeme kaydı",
        expense_date: (p.created_at || "").slice(0, 10),
        type: "gelir",
      }))

      const allItems = [...expenseItems, ...paymentAsExpense]
      setExpenses(allItems)
      const gelir = allItems.filter((x) => x.type === "gelir").reduce((s: number, x) => s + Number(x.amount), 0)
      const gider = allItems.filter((x) => x.type !== "gelir").reduce((s: number, x) => s + Number(x.amount), 0)
      setStats({ totalGelir: gelir, totalGider: gider })
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadExpenses() }, [])

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setMessage({ text: "Tutar giriniz.", ok: false })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.amount),
          category: form.category || null,
          description: form.description || null,
          expense_date: form.expense_date,
          type: form.type,
          is_fixed: form.is_fixed,
          billing_period: form.is_fixed ? form.billing_period : null,
          next_due_date: form.is_fixed && form.next_due_date ? form.next_due_date : null,
          reminder_days_before: form.is_fixed ? Number(form.reminder_days_before || "7") : null,
          is_active: form.is_fixed ? form.is_active : true,
          vendor: form.vendor || null,
          invoice_ref: form.invoice_ref || null,
        }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setMessage({ text: "Hata: " + (result.error || "Bilinmeyen hata"), ok: false })
      } else {
        setMessage({ text: "Kayit basarili!", ok: true })
        setForm({
          type: "gider",
          amount: "",
          category: "",
          description: "",
          expense_date: new Date().toISOString().slice(0, 10),
          is_fixed: false,
          billing_period: "monthly",
          next_due_date: "",
          reminder_days_before: "7",
          is_active: true,
          vendor: "",
          invoice_ref: "",
        })
        loadExpenses()
      }
    } catch {
      setMessage({ text: "Baglanti hatasi.", ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">Kasa Defteri</h2>
        <p className="text-sm text-[#8892a8] mt-1">Gelir-gider kayitlari, ozet kartlar ve yeni kayit ekleme.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[#2a3650] bg-[#0a0e17]/90">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#8892a8]">Toplam Gelir</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{stats.totalGelir.toLocaleString("tr-TR")} TL</p></CardContent>
        </Card>
        <Card className="border-[#2a3650] bg-[#0a0e17]/90">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#8892a8]">Toplam Gider</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-400">{stats.totalGider.toLocaleString("tr-TR")} TL</p></CardContent>
        </Card>
        <Card className="border-[#2a3650] bg-[#0a0e17]/90">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-[#8892a8]">Net Bakiye</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-[#00d4ff]">{(stats.totalGelir - stats.totalGider).toLocaleString("tr-TR")} TL</p></CardContent>
        </Card>
      </div>

      <Card className="border-[#2a3650] bg-[#0a0e17]/90">
        <CardHeader><CardTitle className="text-[#e2e8f0]">Yeni Kayit Ekle</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="rounded-md border border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] px-3 py-2 text-sm"
            >
              <option value="gider">Gider</option>
              <option value="gelir">Gelir</option>
            </select>
            <Input type="number" placeholder="Tutar (TL)" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
            <Input placeholder="Kategori" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
            <Input placeholder="Aciklama" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
            <Input type="date" value={form.expense_date} onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
          </div>
          <div className="mt-3 rounded-lg border border-[#2a3650] bg-[#0a0e17] p-3">
            <label className="text-sm text-[#e2e8f0] inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_fixed}
                onChange={(e) => setForm((f) => ({ ...f, is_fixed: e.target.checked }))}
              />
              Sabit gider / fatura takibi
            </label>
            {form.is_fixed && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mt-3">
                <select
                  value={form.billing_period}
                  onChange={(e) => setForm((f) => ({ ...f, billing_period: e.target.value as "monthly" | "quarterly" | "yearly" | "one_time" }))}
                  className="rounded-md border border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] px-3 py-2 text-sm"
                >
                  <option value="monthly">Aylik</option>
                  <option value="quarterly">3 Aylik</option>
                  <option value="yearly">Yillik</option>
                  <option value="one_time">Tek Seferlik</option>
                </select>
                <Input
                  type="date"
                  placeholder="Sonraki vade"
                  value={form.next_due_date}
                  onChange={(e) => setForm((f) => ({ ...f, next_due_date: e.target.value }))}
                  className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]"
                />
                <Input
                  type="number"
                  placeholder="Hatirlatma (gun)"
                  value={form.reminder_days_before}
                  onChange={(e) => setForm((f) => ({ ...f, reminder_days_before: e.target.value }))}
                  className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]"
                />
                <label className="text-xs text-[#8892a8] inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  Hatirlatma aktif
                </label>
                <Input
                  placeholder="Tedarikci (vendor)"
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                  className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]"
                />
                <Input
                  placeholder="Fatura referansi"
                  value={form.invoice_ref}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_ref: e.target.value }))}
                  className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-[#00d4ff] hover:bg-[#00b8e6] text-black font-medium">
              {saving ? "Kaydediliyor..." : "KAYDET"}
            </Button>
            {message && <span className={message.ok ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>{message.text}</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#2a3650] bg-[#0a0e17]/90">
        <CardHeader><CardTitle className="text-[#e2e8f0]">Kayit Listesi</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[#8892a8]">Yukleniyor...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-[#8892a8]">Henuz kayit yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a3650] text-left">
                    <th className="py-2 pr-4 text-[#818cf8]">Tarih</th>
                    <th className="py-2 pr-4 text-[#818cf8]">Tur</th>
                    <th className="py-2 pr-4 text-[#818cf8]">Kategori</th>
                    <th className="py-2 pr-4 text-[#818cf8]">Aciklama</th>
                    <th className="py-2 pr-4 text-[#818cf8]">Fatura</th>
                    <th className="py-2 text-[#818cf8]">Tutar (TL)</th>
                  </tr>
                </thead>
                <tbody className="text-[#cbd5e1]">
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-[#2a3650]/60">
                      <td className="py-2 pr-4">{e.expense_date?.slice(0, 10)}</td>
                      <td className="py-2 pr-4"><span className={e.type === "gelir" ? "text-emerald-400" : "text-red-400"}>{e.type === "gelir" ? "Gelir" : "Gider"}</span></td>
                      <td className="py-2 pr-4">{e.category ?? "\u2014"}</td>
                      <td className="py-2 pr-4">{e.description ?? "\u2014"}</td>
                      <td className="py-2 pr-4 text-xs">
                        {e.is_fixed ? (
                          <span className="text-[#f59e0b]">
                            {e.vendor || "Sabit"} · {e.next_due_date ? e.next_due_date.slice(0, 10) : "vade yok"}
                          </span>
                        ) : (
                          <span className="text-[#8892a8]">—</span>
                        )}
                      </td>
                      <td className="py-2">{Number(e.amount).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
