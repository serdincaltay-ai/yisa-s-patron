"use client"

import { useEffect, useState } from "react"
import TabletTopBar from "./TabletTopBar"
import TabletLeftPanel from "./TabletLeftPanel"
import TabletCenterPanel from "./TabletCenterPanel"
import TabletRightPanel from "./TabletRightPanel"
import DirectorateOverlay from "./DirectorateOverlay"

export type TabletTab = "ASK" | "SESSION" | "TALEPLER"

export default function TabletFrame() {
  const [activeTab, setActiveTab] = useState<TabletTab>("ASK")
  const [activeDirectorate, setActiveDirectorate] = useState<string | null>(null)
  const [overlayDirectorate, setOverlayDirectorate] = useState<string | null>(null)
  const [quickOverlay, setQuickOverlay] = useState<"kasa" | "api" | "tenant" | "direktorler" | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [introReady, setIntroReady] = useState(false)

  const handleDirectorateSelect = (code: string) => {
    setActiveDirectorate(code)
    setOverlayDirectorate(code)
  }

  useEffect(() => {
    const shown = typeof window !== "undefined" ? window.localStorage.getItem("intro_shown") : "1"
    if (!shown) setShowIntro(true)
    setIntroReady(true)
  }, [])

  const closeIntro = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("intro_shown", "1")
    }
    setShowIntro(false)
  }

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Tablet bezel */}
      <div className="relative w-full max-w-[1400px] h-[calc(100vh-2rem)] rounded-[2rem] border-[6px] border-[#1a1a2e] bg-[#0a0a1a] shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col">
        {/* Bezel highlight (top) */}
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/20 to-transparent" />

        {/* Camera notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#0f0f2a] border border-[#1a1a2e] z-20">
          <div className="absolute inset-[3px] rounded-full bg-[#00d4ff]/10" />
        </div>

        {/* Top bar */}
        <TabletTopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenQuickOverlay={(panel) => setQuickOverlay(panel)}
        />

        {/* Main content area — 3-column layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel */}
          <TabletLeftPanel
            activeDirectorate={activeDirectorate}
            onDirectorateSelect={handleDirectorateSelect}
          />

          {/* Center panel */}
          <TabletCenterPanel activeTab={activeTab} activeDirectorate={activeDirectorate} />

          {/* Right panel */}
          <TabletRightPanel />
        </div>

        {overlayDirectorate && (
          <DirectorateOverlay
            directorateCode={overlayDirectorate}
            onClose={() => setOverlayDirectorate(null)}
          />
        )}

        {quickOverlay && (
          <div className="absolute inset-0 z-40 bg-[#050510]/85 backdrop-blur-sm">
            <div className="absolute right-0 top-0 h-full w-[340px] border-l border-[#1a1a2e] bg-[#0a0a1a] shadow-[-20px_0_60px_rgba(0,0,0,0.45)] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wider">
                  {quickOverlay === "kasa" && "Kasa Overlay"}
                  {quickOverlay === "api" && "API Overlay"}
                  {quickOverlay === "tenant" && "Tenant Overlay"}
                  {quickOverlay === "direktorler" && "Direktörler Overlay"}
                </h4>
                <button
                  type="button"
                  onClick={() => setQuickOverlay(null)}
                  className="text-xs font-mono px-2 py-1 rounded border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10"
                >
                  Kapat
                </button>
              </div>
              <div className="rounded-lg border border-[#1a1a2e] bg-[#0f0f2a]/40 p-3 text-xs text-[#8892a8] leading-relaxed">
                {quickOverlay === "kasa" &&
                  "Kasa ozeti, token maliyetleri ve son odeme durumlari bu panelde gosterilecek."}
                {quickOverlay === "api" &&
                  "API key saglik ozeti, aktif/pasif/hata durumlari ve son ping bilgileri bu panelde gosterilecek."}
                {quickOverlay === "tenant" &&
                  "Tenant listesi, aktif durumlar ve hizli gecis islemleri bu panelde gosterilecek."}
                {quickOverlay === "direktorler" &&
                  "Direktorluk bazli anlik gorev dagilimi ve son aksiyonlar bu panelde gosterilecek."}
              </div>
            </div>
          </div>
        )}

        {introReady && showIntro && (
          <div className="absolute inset-0 z-50 bg-[#050510]/95 backdrop-blur-sm flex items-center justify-center">
            <div className="w-[90%] max-w-4xl rounded-2xl border border-[#00d4ff]/25 bg-[#0a0a1a] overflow-hidden shadow-[0_0_60px_rgba(0,212,255,0.12)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
                <div className="text-xs font-mono text-[#00d4ff] tracking-wider uppercase">
                  YİSA-S Intro
                </div>
                <button
                  type="button"
                  onClick={closeIntro}
                  className="text-xs font-mono px-3 py-1.5 rounded-md border border-[#00d4ff]/30 text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
                >
                  Atla
                </button>
              </div>
              {!videoFailed ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-[52vh] object-cover bg-black"
                  src="/intro.mp4"
                  onEnded={closeIntro}
                  onError={() => setVideoFailed(true)}
                />
              ) : (
                <div className="h-[52vh] flex items-center justify-center bg-[radial-gradient(circle_at_center,#0f172a, #050510)]">
                  <div className="text-center">
                    <div className="mx-auto w-20 h-20 rounded-2xl border border-[#00d4ff]/40 bg-[#00d4ff]/10 flex items-center justify-center animate-pulse">
                      <span className="text-2xl font-bold font-mono text-[#00d4ff]">Y</span>
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-[#e2e8f0] tracking-wide">YİSA-S</h2>
                    <p className="mt-2 text-sm text-[#8892a8]">Spor Tesisi Yonetim Sistemi</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bezel highlight */}
        <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#00d4ff]/10 to-transparent" />
      </div>
    </div>
  )
}
