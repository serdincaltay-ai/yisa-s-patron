"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#060a13] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[#818cf8]/30 rounded-full" />
          <div className="absolute inset-5 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#818cf8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#e2e8f0] mb-2">Cevrimdisi</h1>
        <p className="text-sm text-[#8892a8] mb-6">
          Internet baglantiniz yok. Lutfen baglantinizi kontrol edip tekrar deneyin.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/25 rounded-xl text-sm font-bold hover:bg-[#818cf8]/25 transition-all min-h-[44px] min-w-[44px]"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}
