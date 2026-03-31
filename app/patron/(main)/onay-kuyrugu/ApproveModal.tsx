"use client"

import { useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateSlug } from "@/lib/utils/slug"

type RequestInfo = { id: string; name: string; phone?: string }

export default function ApproveModal({
  open,
  onOpenChange,
  request,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: RequestInfo | null
  onConfirm: () => Promise<void>
  isLoading: boolean
}) {
  const slugPreview = useMemo(() => {
    if (!request?.name) return ""
    const base = generateSlug(request.name) || "tenant"
    return `${base}.yisa-s.com`
  }, [request])

  const credentialPreview = useMemo(() => {
    if (!request?.phone) return null
    const cleanDigits = request.phone.replace(/\D/g, "")
    const phoneDigits = cleanDigits.startsWith("90") && cleanDigits.length === 12
      ? cleanDigits.slice(2)
      : cleanDigits.startsWith("0") && cleanDigits.length === 11
        ? cleanDigits.slice(1)
        : cleanDigits
    if (phoneDigits.length < 10) return null
    return {
      username: phoneDigits,
      password: phoneDigits.slice(-4),
    }
  }, [request])

  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a1a] border-[#0f3460]/40 text-[#e2e8f0] max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#e2e8f0]">
            Talebi onayla
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-[#8892a8]">
            Bu talebi onaylayip tenant olusturmak istediginize emin misiniz?
          </p>
          {slugPreview && (
            <p className="text-sm">
              <span className="text-[#8892a8]">Olusturulacak subdomain: </span>
              <span className="font-mono text-[#00d4ff]">{slugPreview}</span>
            </p>
          )}
          {credentialPreview && (
            <div className="rounded-lg bg-[#0f3460]/20 border border-[#0f3460]/40 p-3 space-y-1.5">
              <p className="text-xs font-medium text-[#00d4ff] uppercase tracking-wide">Otomatik Olusturulacak Hesap</p>
              <div className="text-sm font-mono">
                <p><span className="text-[#8892a8]">Kullanici Adi: </span><span className="text-[#e2e8f0]">{credentialPreview.username}</span></p>
                <p><span className="text-[#8892a8]">Gecici Sifre: </span><span className="text-[#e2e8f0]">{credentialPreview.password}</span></p>
              </div>
              <p className="text-[10px] text-[#8892a8]">Demo suresi: 30 gun</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-[#0f3460]/60 text-[#8892a8] hover:bg-[#0f3460]/20"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="button"
            className="min-h-[44px] min-w-[44px] bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/30"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "İşleniyor…" : "Onayla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
