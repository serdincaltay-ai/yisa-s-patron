"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

export default function KomutPanel({
  directorateSlug,
  onSuccess,
}: {
  directorateSlug: string
  onSuccess?: () => void
}) {
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    const text = command.trim()
    if (!text || loading) return
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      const res = await fetch("/api/motor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directorate_slug: directorateSlug, command: text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Komut gönderilemedi")
        return
      }
      setSuccess(true)
      setCommand("")
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 backdrop-blur-md bg-white/5 p-4 space-y-3">
      <label className="block text-sm font-medium text-[#e2e8f0]">
        Yeni görev / komut
      </label>
      <textarea
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="CELF'e göndermek istediğiniz komutu yazın…"
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-[#0a0a1a]/80 px-4 py-3 text-[#e2e8f0] placeholder:text-[#8892a8]/50 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40 resize-none"
        disabled={loading}
      />
      {error && (
        <p className="text-sm text-[#e94560]">{error}</p>
      )}
      {success && (
        <p className="text-sm text-[#10b981]">Komut gönderildi.</p>
      )}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !command.trim()}
        className={cn(
          "min-h-[44px] min-w-[44px] gap-2",
          "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
        )}
      >
        <Send className="h-4 w-4" />
        {loading ? "Gönderiliyor…" : "Gönder"}
      </Button>
    </div>
  )
}
