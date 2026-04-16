"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send, Sparkles } from "lucide-react"
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
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [assistantSuggestion, setAssistantSuggestion] = useState<string | null>(null)

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

  const handleAskAssistant = async () => {
    if (loading || assistantLoading) return
    setError(null)
    setSuccess(false)
    setAssistantLoading(true)
    try {
      const res = await fetch("/api/celf/directorates/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directorate_slug: directorateSlug,
          prompt: command.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Asistan onerisi alinamadi")
        return
      }
      const suggestion = typeof data?.suggestion === "string" ? data.suggestion.trim() : ""
      if (!suggestion) {
        setError("Asistan gecerli bir oneride bulunamadi")
        return
      }
      setAssistantSuggestion(suggestion)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Asistan baglanti hatasi")
    } finally {
      setAssistantLoading(false)
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
      {assistantSuggestion && (
        <div className="rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-3 space-y-2">
          <p className="text-xs text-[#c4b5fd] uppercase tracking-wide">Gemini 2.0 Flash Asistan Onerisi</p>
          <p className="text-sm text-[#e2e8f0] whitespace-pre-wrap">{assistantSuggestion}</p>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[#8b5cf6]/50 text-[#c4b5fd] hover:bg-[#8b5cf6]/20"
              onClick={() => setCommand(assistantSuggestion)}
            >
              Komuta aktar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleAskAssistant}
          disabled={loading || assistantLoading}
          variant="outline"
          className={cn(
            "min-h-[44px] min-w-[44px] gap-2 border-[#8b5cf6]/50 text-[#c4b5fd] hover:bg-[#8b5cf6]/20"
          )}
        >
          <Sparkles className="h-4 w-4" />
          {assistantLoading ? "Asistan dusunuyor..." : "Asistan (Gemini 2.0 Flash)"}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading || assistantLoading || !command.trim()}
          className={cn(
            "min-h-[44px] min-w-[44px] gap-2",
            "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
          )}
        >
          <Send className="h-4 w-4" />
          {loading ? "Gonderiliyor..." : "Gonder"}
        </Button>
      </div>
    </div>
  )
}
