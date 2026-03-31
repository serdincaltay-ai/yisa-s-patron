"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function OnayKuyruguError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Onay Kuyruğu hata:", error.message)
  }, [error])

  return (
    <div className="rounded-xl border border-[#e94560]/40 bg-[#e94560]/5 p-6 md:p-8 text-center space-y-4">
      <h3 className="text-lg font-semibold text-[#e2e8f0]">Bir hata oluştu</h3>
      <p className="text-sm text-[#8892a8] max-w-md mx-auto">
        {error.message || "Demo talepleri yüklenirken bir sorun oluştu. Lütfen tekrar deneyin."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={reset}
          className="min-h-[44px] px-6 bg-[#0f3460] hover:bg-[#0f3460]/90 text-white"
        >
          Tekrar dene
        </Button>
        <Button
          asChild
          variant="outline"
          className="min-h-[44px] px-6 border-[#0f3460]/40 text-[#00d4ff] hover:bg-[#0f3460]/20"
        >
          <Link href="/">Ana panele dön</Link>
        </Button>
      </div>
    </div>
  )
}
