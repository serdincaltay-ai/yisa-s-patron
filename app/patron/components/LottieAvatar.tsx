"use client"

import { useEffect, useState } from "react"
import Lottie from "lottie-react"

export function LottieAvatar() {
  const [data, setData] = useState<object | null>(null)

  useEffect(() => {
    fetch("/lottie/patron-avatar.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (!data) {
    return (
      <div className="w-full h-full min-w-[96px] min-h-[96px] rounded-full bg-[#00d4ff]/20 animate-pulse" />
    )
  }

  return (
    <Lottie
      animationData={data}
      loop
      style={{ width: 96, height: 96 }}
    />
  )
}
