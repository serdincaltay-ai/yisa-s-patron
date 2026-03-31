"use client"

import { useState, useEffect } from "react"

/* ================================================================
   RobotAvatar — Neon renkli teknolojik robot yüzü
   CSS 3D transform + animasyonlar ile canlı yüz efekti
   - Konuşma durumunda dudak hareketi
   - Idle durumda göz kırpma + nefes alma
   - Robot tipine göre renk/ifade değişimi
   ================================================================ */

export type RobotType = "gemini" | "claude" | "gpt" | "cursor" | "v0" | "fal"

interface RobotAvatarProps {
  robot: RobotType
  isSpeaking?: boolean
  size?: "sm" | "md" | "lg"
}

const ROBOT_COLORS: Record<RobotType, { primary: string; secondary: string; glow: string }> = {
  gemini:  { primary: "#00d4ff", secondary: "#4285f4", glow: "rgba(0,212,255,0.4)" },
  claude:  { primary: "#e94560", secondary: "#cc785c", glow: "rgba(233,69,96,0.4)" },
  gpt:     { primary: "#10b981", secondary: "#34d399", glow: "rgba(16,185,129,0.4)" },
  cursor:  { primary: "#ffa500", secondary: "#f59e0b", glow: "rgba(255,165,0,0.4)" },
  v0:      { primary: "#a855f7", secondary: "#7c3aed", glow: "rgba(168,85,247,0.4)" },
  fal:     { primary: "#ec4899", secondary: "#f472b6", glow: "rgba(236,72,153,0.4)" },
}

const SIZES = { sm: 80, md: 120, lg: 180 }

export default function RobotAvatar({ robot, isSpeaking = false, size = "md" }: RobotAvatarProps) {
  const [blinking, setBlinking] = useState(false)
  const colors = ROBOT_COLORS[robot]
  const px = SIZES[size]

  // Blink cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 200)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])

  const eyeH = blinking ? 2 : px * 0.1
  const mouthW = px * 0.3
  const scale = size === "sm" ? 0.65 : size === "lg" ? 1.4 : 1

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: px, height: px }}
    >
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          animationDuration: "3s",
        }}
      />

      {/* Head */}
      <svg
        viewBox="0 0 200 200"
        width={px}
        height={px}
        className="relative z-10"
        style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
      >
        {/* Outer ring — neon border */}
        <circle
          cx="100" cy="100" r="90"
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          opacity="0.5"
        >
          <animate
            attributeName="r"
            values="88;92;88"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Face plate */}
        <circle
          cx="100" cy="100" r="80"
          fill="#0a0a1a"
          stroke={colors.primary}
          strokeWidth="2.5"
        />

        {/* Inner circuit lines */}
        <path
          d="M 40 100 Q 60 80, 100 75 Q 140 80, 160 100"
          fill="none"
          stroke={colors.secondary}
          strokeWidth="0.8"
          opacity="0.3"
        />
        <path
          d="M 50 120 Q 80 110, 100 108 Q 120 110, 150 120"
          fill="none"
          stroke={colors.secondary}
          strokeWidth="0.8"
          opacity="0.3"
        />

        {/* Left eye */}
        <rect
          x="65" y={88 - eyeH / 2}
          width="22"
          height={eyeH}
          rx={eyeH / 2}
          fill={colors.primary}
        >
          {!blinking && (
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </rect>

        {/* Right eye */}
        <rect
          x="113" y={88 - eyeH / 2}
          width="22"
          height={eyeH}
          rx={eyeH / 2}
          fill={colors.primary}
        >
          {!blinking && (
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </rect>

        {/* Eye glow */}
        {!blinking && (
          <>
            <circle cx="76" cy="88" r="6" fill={colors.glow} opacity="0.5" />
            <circle cx="124" cy="88" r="6" fill={colors.glow} opacity="0.5" />
          </>
        )}

        {/* Mouth */}
        {isSpeaking ? (
          <ellipse
            cx="100" cy="130"
            rx={mouthW / 2}
            ry="8"
            fill={colors.primary}
            opacity="0.8"
          >
            <animate
              attributeName="ry"
              values="4;10;6;10;4"
              dur="0.4s"
              repeatCount="indefinite"
            />
          </ellipse>
        ) : (
          <line
            x1={100 - mouthW / 2} y1="130"
            x2={100 + mouthW / 2} y2="130"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        )}

        {/* Antenna dot */}
        <circle cx="100" cy="18" r="4" fill={colors.primary}>
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        <line
          x1="100" y1="22" x2="100" y2="30"
          stroke={colors.primary}
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>

      {/* Breathing animation ring */}
      <div
        className="absolute inset-0 rounded-full border-2 opacity-20"
        style={{
          borderColor: colors.primary,
          animation: "breathe 4s ease-in-out infinite",
        }}
      />

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.05); opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
