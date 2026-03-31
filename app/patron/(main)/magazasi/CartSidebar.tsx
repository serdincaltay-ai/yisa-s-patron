"use client"

import { ShoppingCart, X, CreditCard } from "lucide-react"
import type { CartItem } from "@/lib/store/robots-config"

interface CartSidebarProps {
  items: CartItem[]
  onRemove: (itemId: string) => void
  onCheckout: () => void
  isCheckingOut: boolean
}

export default function CartSidebar({ items, onRemove, onCheckout, isCheckingOut }: CartSidebarProps) {
  const total = items.reduce((sum, item) => sum + item.monthlyPrice, 0)

  return (
    <div className="rounded-2xl border border-[#0f3460]/40 bg-[#0a0a1a]/80 p-5 sticky top-4">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingCart className="w-5 h-5 text-[#00d4ff]" />
        <h3 className="text-base font-bold text-[#e2e8f0]">Sepet</h3>
        {items.length > 0 && (
          <span className="ml-auto text-xs bg-[#00d4ff]/20 text-[#00d4ff] px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-6">Sepetiniz bos</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center justify-between bg-zinc-800/30 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    {item.type === "package" ? "Paket" : "Robot"} · ${item.monthlyPrice}/ay
                  </p>
                </div>
                <button
                  onClick={() => onRemove(item.itemId)}
                  className="ml-2 p-1 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label={`${item.name} kaldir`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-800 pt-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Aylik Toplam</span>
              <span className="text-xl font-bold text-[#e2e8f0]">${total}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">/ay olarak faturalanir</p>
          </div>

          <button
            onClick={onCheckout}
            disabled={isCheckingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30 font-bold text-sm hover:bg-[#00d4ff]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            {isCheckingOut ? "Isleniyor..." : "Satin Al"}
          </button>
        </>
      )}
    </div>
  )
}
