"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export default function ProfilPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setForm({
            full_name: user.user_metadata?.full_name || "",
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
            role: user.user_metadata?.role || "",
          })
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { full_name: form.full_name, phone: form.phone },
      })
      if (error) {
        setMessage({ text: "Hata: " + error.message, ok: false })
      } else {
        setMessage({ text: "Profil guncellendi!", ok: true })
      }
    } catch {
      setMessage({ text: "Baglanti hatasi.", ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-[#8892a8]">Yukleniyor...</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">Profil Duzenleme</h2>
        <p className="text-sm text-[#8892a8] mt-1">Kisisel bilgilerinizi guncelleyin.</p>
      </div>

      <Card className="border-[#2a3650] bg-[#0a0e17]/90">
        <CardHeader><CardTitle className="text-[#e2e8f0]">Kisisel Bilgiler</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">Ad Soyad</label>
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
          </div>
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">E-posta</label>
            <Input value={form.email} disabled className="border-[#2a3650] bg-[#0a0e17] text-[#8892a8]" />
          </div>
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">Telefon</label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" placeholder="+90 5XX XXX XX XX" />
          </div>
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">Rol</label>
            <Input value={form.role} disabled className="border-[#2a3650] bg-[#0a0e17] text-[#8892a8]" />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-[#00d4ff] hover:bg-[#00b8e6] text-black font-medium">
              {saving ? "Kaydediliyor..." : "KAYDET"}
            </Button>
            {message && <span className={message.ok ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>{message.text}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
