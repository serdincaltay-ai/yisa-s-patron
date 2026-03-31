"use client"

import { useState, useCallback } from "react"
import RobotCard from "./RobotCard"
import PackageCard from "./PackageCard"
import CartSidebar from "./CartSidebar"
import {
  ROBOTS,
  PACKAGES,
  getRobotsForPackage,
} from "@/lib/store/robots-config"
import type {
  RobotDefinition,
  PackageDefinition,
  CartItem,
} from "@/lib/store/robots-config"

interface StoreClientProps {
  tenantId: string | null
  ownedRobotIds: string[]
  ownedPackageIds: string[]
}

export default function StoreClient({ tenantId, ownedRobotIds, ownedPackageIds }: StoreClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<"robots" | "packages">("packages")
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  const cartItemIds = new Set(cart.map((c) => c.itemId))

  const addRobotToCart = useCallback((robot: RobotDefinition) => {
    setCart((prev) => {
      if (prev.some((c) => c.itemId === robot.id)) return prev
      return [
        ...prev,
        {
          type: "robot" as const,
          itemId: robot.id,
          name: robot.name,
          monthlyPrice: robot.monthlyPrice,
        },
      ]
    })
  }, [])

  const addPackageToCart = useCallback((pkg: PackageDefinition) => {
    setCart((prev) => {
      if (prev.some((c) => c.itemId === pkg.id)) return prev
      // Paket eklendiginde, dahil olan tekil robotlari sepetten cikar
      const robotIdsInPackage = new Set(pkg.robotIds)
      const filtered = prev.filter((c) => !(c.type === "robot" && robotIdsInPackage.has(c.itemId)))
      return [
        ...filtered,
        {
          type: "package" as const,
          itemId: pkg.id,
          name: pkg.name,
          monthlyPrice: pkg.monthlyPrice,
        },
      ]
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId))
  }, [])

  const handleCheckout = useCallback(async () => {
    if (!tenantId || cart.length === 0) return

    setIsCheckingOut(true)
    setFeedbackMessage(null)

    try {
      const successIds: string[] = []
      const successNames: string[] = []

      for (const item of cart) {
        const res = await fetch("/api/store/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            itemType: item.type,
            itemId: item.itemId,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          successNames.push(data.item_name)
          successIds.push(item.itemId)
        }
      }

      if (successIds.length === cart.length) {
        setFeedbackMessage({ text: `Basariyla satin alindi: ${successNames.join(", ")}`, type: "success" })
        setCart([])
      } else if (successIds.length > 0) {
        const failCount = cart.length - successIds.length
        setFeedbackMessage({ text: `${successNames.join(", ")} satin alindi, ancak ${failCount} urun basarisiz oldu.`, type: "error" })
        setCart((prev) => prev.filter((c) => !successIds.includes(c.itemId)))
      } else {
        setFeedbackMessage({ text: "Satin alma sirasinda bir hata olustu. Lutfen tekrar deneyin.", type: "error" })
      }
    } catch {
      setFeedbackMessage({ text: "Satin alma sirasinda bir hata olustu. Lutfen tekrar deneyin.", type: "error" })
    } finally {
      setIsCheckingOut(false)
    }
  }, [tenantId, cart])

  return (
    <div className="space-y-6">
      {/* Baslik */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e2e8f0] tracking-tight">
          COO Magazasi
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Isletmeniz icin yapay zeka robotlari ve paketleri secin
        </p>
      </div>

      {/* Geri bildirim mesaji */}
      {feedbackMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedbackMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {feedbackMessage.text}
        </div>
      )}

      {!tenantId && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          Satin alma icin bir tenant secmeniz gerekiyor. Lutfen Franchise sayfasindan bir tenant secin.
        </div>
      )}

      {/* Tab secici */}
      <div className="flex gap-1 bg-zinc-800/30 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("packages")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "packages"
              ? "bg-[#00d4ff]/20 text-[#00d4ff]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Paketler
        </button>
        <button
          onClick={() => setActiveTab("robots")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "robots"
              ? "bg-[#00d4ff]/20 text-[#00d4ff]"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Tekil Robotlar
        </button>
      </div>

      <div className="flex gap-6">
        {/* Ana icerik */}
        <div className="flex-1 min-w-0">
          {activeTab === "packages" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {PACKAGES.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  robots={getRobotsForPackage(pkg.id)}
                  isOwned={ownedPackageIds.includes(pkg.id)}
                  isInCart={cartItemIds.has(pkg.id)}
                  onAddToCart={addPackageToCart}
                />
              ))}
            </div>
          )}

          {activeTab === "robots" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ROBOTS.map((robot) => (
                <RobotCard
                  key={robot.id}
                  robot={robot}
                  isOwned={ownedRobotIds.includes(robot.id)}
                  isInCart={cartItemIds.has(robot.id)}
                  onAddToCart={addRobotToCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sepet sidebar */}
        <div className="w-72 flex-shrink-0 hidden md:block">
          <CartSidebar
            items={cart}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        </div>
      </div>
    </div>
  )
}
