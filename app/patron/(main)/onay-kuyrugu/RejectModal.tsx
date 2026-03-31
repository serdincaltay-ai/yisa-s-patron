"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function RejectModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string | null) => Promise<void>
  isLoading: boolean
}) {
  const [reason, setReason] = useState("")

  const handleClose = (open: boolean) => {
    if (!open) setReason("")
    onOpenChange(open)
  }

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || null)
    setReason("")
    handleClose(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0a1a] border-[#0f3460]/40 text-[#e2e8f0] max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#e2e8f0]">
            Talebi reddet
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-[#8892a8]">
            Bu talebi reddetmek istediğinize emin misiniz?
          </p>
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm text-[#8892a8]">
              Red nedeni (opsiyonel)
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="İsteğe bağlı açıklama…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] bg-[#0f3460]/10 border-[#0f3460]/40 text-[#e2e8f0] placeholder:text-[#8892a8]/50 resize-none"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] min-w-[44px] border-[#0f3460]/60 text-[#8892a8] hover:bg-[#0f3460]/20"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="button"
            className="min-h-[44px] min-w-[44px] bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/40 hover:bg-[#e94560]/30"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "İşleniyor…" : "Reddet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
