"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getDirectorateBySlug } from "@/lib/direktorlukler/config"
import KomutPanel from "../KomutPanel"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface OutputRow {
  id: string
  command: string
  output: string | null
  status: string
  created_at: string
}

export default function DirektorlukSlugPage() {
  const params = useParams()
  const slug = typeof params.slug === "string" ? params.slug : ""
  const directorate = getDirectorateBySlug(slug)
  const [outputs, setOutputs] = useState<OutputRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadOutputs = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/motor?directorate_slug=${encodeURIComponent(slug)}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Gorev gecmisi alinamadi")
      }
      setOutputs(Array.isArray(payload?.data) ? payload.data : [])
    } catch (error) {
      setOutputs([])
      setLoadError(error instanceof Error ? error.message : "Gorev gecmisi alinamadi")
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadOutputs()
  }, [loadOutputs])

  if (!directorate) {
    return (
      <div className="rounded-xl border border-[#e94560]/40 bg-[#e94560]/5 p-6 text-center">
        <p className="text-[#e2e8f0]">Direktörlük bulunamadı.</p>
        <Link
          href="/patron/direktorlukler"
          className="inline-flex items-center gap-2 min-h-[44px] mt-4 text-[#00d4ff] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Direktörlüklere dön
        </Link>
      </div>
    )
  }

  const Icon = directorate.icon
  const color = directorate.neonColor

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/patron/direktorlukler"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#8892a8] hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors"
          aria-label="Direktörlüklere dön"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10"
          style={{
            backgroundColor: `${color}15`,
            boxShadow: `0 0 16px ${color}25`,
            color,
          }}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e2e8f0]">{directorate.name}</h2>
          <p className="text-sm text-[#8892a8]">{directorate.description}</p>
        </div>
      </div>

      <KomutPanel
        directorateSlug={slug}
        onSuccess={() => {
          loadOutputs()
        }}
      />

      <div className="rounded-xl border border-white/10 backdrop-blur-md bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-[#e2e8f0]">Görev geçmişi</h3>
        </div>
        <div className="divide-y divide-white/10 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-[#8892a8]">Yükleniyor…</div>
          ) : loadError ? (
            <div className="p-4 text-sm text-[#fca5a5]">
              Gorev gecmisi yuklenemedi: {loadError}
            </div>
          ) : outputs.length === 0 ? (
            <div className="p-4 text-sm text-[#8892a8]">Henüz görev yok.</div>
          ) : (
            outputs.map((row) => (
              <div key={row.id} className="p-4">
                <p className="text-sm text-[#e2e8f0] whitespace-pre-wrap">{row.command}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      row.status === "beklemede"
                        ? "bg-[#ffa500]/20 text-[#ffa500]"
                        : "bg-[#10b981]/20 text-[#10b981]"
                    )}
                  >
                    {row.status === "beklemede" ? "Beklemede" : "İşlendi"}
                  </span>
                  <span className="text-xs text-[#8892a8]">
                    {new Date(row.created_at).toLocaleString("tr-TR")}
                  </span>
                </div>
                {row.output && (
                  <p className="text-xs text-[#8892a8] mt-2 whitespace-pre-wrap border-t border-white/5 pt-2">
                    {row.output}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
