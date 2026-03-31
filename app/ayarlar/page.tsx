"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export default function AyarlarPage() {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [settings, setSettings] = useState({
    notifications_email: true,
    notifications_sms: false,
    notifications_push: true,
    language: "tr",
    theme: "dark",
    timezone: "Europe/Istanbul",
  })

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: { settings },
        })
        if (error) {
          setMessage({ text: "Hata: " + error.message, ok: false })
        } else {
          setMessage({ text: "Ayarlar kaydedildi!", ok: true })
        }
      } else {
        setMessage({ text: "Oturum suresi dolmus. Lutfen tekrar giris yapin.", ok: false })
      }
    } catch {
      setMessage({ text: "Baglanti hatasi.", ok: false })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">Ayarlar</h2>
        <p className="text-sm text-[#8892a8] mt-1">Bildirim tercihleri ve genel ayarlar.</p>
      </div>

      <Card className="border-[#2a3650] bg-[#0a0e17]/90">
        <CardHeader><CardTitle className="text-[#e2e8f0]">Bildirim Tercihleri</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "notifications_email", label: "E-posta bildirimleri" },
            { key: "notifications_sms", label: "SMS bildirimleri" },
            { key: "notifications_push", label: "Push bildirimleri" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[item.key as keyof typeof settings] as boolean}
                onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.checked }))}
                className="w-4 h-4 rounded border-[#2a3650] bg-[#0a0e17] accent-[#00d4ff]"
              />
              <span className="text-sm text-[#e2e8f0]">{item.label}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[#2a3650] bg-[#0a0e17]/90">
        <CardHeader><CardTitle className="text-[#e2e8f0]">Genel Ayarlar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">Dil</label>
            <select value={settings.language} onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))} className="rounded-md border border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] px-3 py-2 text-sm w-full">
              <option value="tr">Turkce</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">Tema</label>
            <select value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value }))} className="rounded-md border border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0] px-3 py-2 text-sm w-full">
              <option value="dark">Karanlik</option>
              <option value="light">Aydinlik</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8892a8] mb-1 block">Saat Dilimi</label>
            <Input value={settings.timezone} onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))} className="border-[#2a3650] bg-[#0a0e17] text-[#e2e8f0]" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} className="bg-[#00d4ff] hover:bg-[#00b8e6] text-black font-medium">
          {saving ? "Kaydediliyor..." : "KAYDET"}
        </Button>
        {message && <span className={message.ok ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>{message.text}</span>}
      </div>
    </div>
  )
}
