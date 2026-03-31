"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Brain } from "lucide-react"

const MODELS = [
  { value: "claude", label: "Claude" },
  { value: "gpt", label: "GPT-4" },
  { value: "gemini", label: "Gemini" },
] as const

interface BrainTask {
  id: string
  model: string
  prompt: string
  response: string | null
  status: string
  created_at: string
}

export default function DashboardBeyinTakimiPage() {
  const [model, setModel] = useState<string>("claude")
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<BrainTask[]>([])

  useEffect(() => {
    fetch("/api/brain")
      .then((r) => r.json())
      .then((data) => setHistory(data.data ?? []))
      .catch(() => setHistory([]))
  }, [])

  const handleSend = async () => {
    const text = prompt.trim()
    if (!text || loading) return
    setError(null)
    setResponse(null)
    setLoading(true)
    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: text,
          context: context.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Gönderilemedi")
        return
      }
      setResponse(data.response ?? null)
      setPrompt("")
      setHistory((prev) => [
        {
          id: data.id,
          model: data.model,
          prompt: text,
          response: data.response,
          status: data.status,
          created_at: data.created_at,
        },
        ...prev,
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-8 w-8 text-[#00d4ff]" />
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0]">
          Beyin Takımı
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 space-y-4">
          <h3 className="text-base font-semibold text-[#00d4ff]">Model Seçici</h3>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="min-h-[44px] text-base bg-[#0a0a1a] border-[#0f3460]/40 text-[#e2e8f0]">
              <SelectValue placeholder="Model seçin" />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-base">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <h3 className="text-base font-semibold text-[#00d4ff]">Görev Gönderme</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Görevi yazın…"
            rows={5}
            className="w-full min-h-[44px] text-base rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a] px-4 py-3 text-[#e2e8f0] placeholder:text-[#8892a8]/60 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40 resize-none"
            disabled={loading}
          />
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Bağlam (opsiyonel)"
            rows={2}
            className="w-full min-h-[44px] text-base rounded-lg border border-[#0f3460]/40 bg-[#0a0a1a] px-4 py-3 text-[#e2e8f0] placeholder:text-[#8892a8]/60 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/40 resize-none"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
            className="min-h-[44px] px-6 text-base bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
          >
            {loading ? "Gönderiliyor…" : "Gönder"}
          </Button>
          {error && (
            <p className="text-base text-[#e94560]">{error}</p>
          )}
        </section>

        <section className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-4 space-y-4">
          <h3 className="text-base font-semibold text-[#00d4ff]">Yanıt Alanı</h3>
          <div className="min-h-[200px] rounded-lg border border-[#0f3460]/30 bg-[#0a0a1a] p-4 text-base text-[#e2e8f0] whitespace-pre-wrap">
            {response ?? "Yanıt burada görünecek."}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#0f3460]/40">
          <h3 className="text-base font-semibold text-[#00d4ff]">Görev Geçmişi</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-[#0f3460]/20">
          {history.length === 0 ? (
            <div className="p-4 text-base text-[#8892a8]">Henüz görev yok.</div>
          ) : (
            history.map((task) => (
              <div key={task.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-medium text-[#00d4ff]">
                    {MODELS.find((m) => m.value === task.model)?.label ?? task.model}
                  </span>
                  <span className="text-base text-[#8892a8]">
                    {new Date(task.created_at).toLocaleString("tr-TR")}
                  </span>
                </div>
                <p className="text-base text-[#e2e8f0] whitespace-pre-wrap">
                  {task.prompt}
                </p>
                {task.response && (
                  <p className="text-base text-[#8892a8] mt-2 whitespace-pre-wrap border-t border-[#0f3460]/20 pt-2">
                    {task.response}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
