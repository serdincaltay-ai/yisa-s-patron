"use client"

import { useEffect, useRef } from "react"

/**
 * Animated talking face avatar — CSS + Canvas based.
 * Creates a pulsing, glowing AI face that gives a "speaking" impression.
 */
export default function TabletAvatar() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 160
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    let frame = 0
    let animId: number

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)
      const t = frame * 0.02

      // Outer glow ring
      const glowRadius = 68 + Math.sin(t * 1.5) * 3
      const gradient = ctx.createRadialGradient(cx, cy, 40, cx, cy, glowRadius)
      gradient.addColorStop(0, "rgba(0,212,255,0.05)")
      gradient.addColorStop(0.6, "rgba(0,212,255,0.08)")
      gradient.addColorStop(1, "rgba(0,212,255,0)")
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
      ctx.fill()

      // Head circle
      ctx.fillStyle = "rgba(15,15,42,0.9)"
      ctx.strokeStyle = `rgba(0,212,255,${0.3 + Math.sin(t) * 0.1})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, 52, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Eyes
      const eyeY = cy - 8
      const eyeSpacing = 16
      const blinkPhase = Math.sin(t * 0.8)
      const eyeHeight = blinkPhase > 0.95 ? 1 : 5

      // Left eye
      ctx.fillStyle = "#00d4ff"
      ctx.shadowColor = "#00d4ff"
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.ellipse(cx - eyeSpacing, eyeY, 4, eyeHeight, 0, 0, Math.PI * 2)
      ctx.fill()

      // Right eye
      ctx.beginPath()
      ctx.ellipse(cx + eyeSpacing, eyeY, 4, eyeHeight, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0

      // Mouth — animated speaking effect
      const mouthWidth = 14 + Math.sin(t * 3.2) * 6
      const mouthHeight = 3 + Math.abs(Math.sin(t * 4.1)) * 5
      const mouthY = cy + 16

      ctx.strokeStyle = `rgba(0,212,255,${0.5 + Math.sin(t * 2) * 0.2})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(cx, mouthY, mouthWidth, mouthHeight, 0, 0, Math.PI)
      ctx.stroke()

      // Voice wave bars (under avatar)
      const barCount = 7
      const barWidth = 3
      const barGap = 5
      const barsStartX = cx - ((barCount - 1) * (barWidth + barGap)) / 2
      const barsY = cy + 42

      for (let i = 0; i < barCount; i++) {
        const barH = 4 + Math.abs(Math.sin(t * 3 + i * 0.8)) * 10
        const alpha = 0.3 + Math.abs(Math.sin(t * 2.5 + i * 0.6)) * 0.4
        ctx.fillStyle = `rgba(0,212,255,${alpha})`
        ctx.fillRect(
          barsStartX + i * (barWidth + barGap) - barWidth / 2,
          barsY - barH / 2,
          barWidth,
          barH
        )
      }

      frame++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Pulsing ring */}
        <div className="absolute inset-[-8px] rounded-full border border-[#00d4ff]/10 animate-ping" style={{ animationDuration: "3s" }} />
        <div className="absolute inset-[-4px] rounded-full border border-[#00d4ff]/20 animate-pulse" />
        <canvas ref={canvasRef} className="relative z-10" />
      </div>
      <div className="text-center">
        <p className="text-xs font-mono text-[#00d4ff] font-medium tracking-wider">
          CELF Asistan
        </p>
        <p className="text-[9px] font-mono text-[#8892a8] mt-0.5">
          Dinliyorum...
        </p>
      </div>
    </div>
  )
}
