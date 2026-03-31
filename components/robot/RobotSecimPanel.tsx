"use client"

import type { RobotType } from "./RobotAvatar"

/* ================================================================
   RobotSecimPanel — Robot seçim butonları
   Gemini (varsayılan), Claude, GPT-4o, Cursor, V0, Fal AI
   Seçili robot neon border glow efekti ile vurgulanır
   ================================================================ */

interface RobotSecimPanelProps {
  selected: RobotType
  onSelect: (robot: RobotType) => void
}

interface RobotInfo {
  id: RobotType
  name: string
  description: string
  icon: string
  color: string
  glow: string
}

const ROBOTS: RobotInfo[] = [
  {
    id: "gemini",
    name: "Gemini",
    description: "Hizli ve cok yonlu",
    icon: "G",
    color: "#00d4ff",
    glow: "rgba(0,212,255,0.3)",
  },
  {
    id: "claude",
    name: "Claude",
    description: "Derin analiz ve kod",
    icon: "C",
    color: "#e94560",
    glow: "rgba(233,69,96,0.3)",
  },
  {
    id: "gpt",
    name: "GPT-4o",
    description: "Genel amacli guclu",
    icon: "4",
    color: "#10b981",
    glow: "rgba(16,185,129,0.3)",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Kod ozellestirilmis",
    icon: "Cu",
    color: "#ffa500",
    glow: "rgba(255,165,0,0.3)",
  },
  {
    id: "v0",
    name: "V0",
    description: "UI tasarim uretimi",
    icon: "V",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.3)",
  },
  {
    id: "fal",
    name: "Fal AI",
    description: "Gorsel uretim",
    icon: "F",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.3)",
  },
]

export default function RobotSecimPanel({ selected, onSelect }: RobotSecimPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ROBOTS.map((robot) => {
        const isSelected = selected === robot.id
        return (
          <button
            key={robot.id}
            onClick={() => onSelect(robot.id)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 min-w-[120px]"
            style={{
              borderColor: isSelected ? robot.color : "rgba(255,255,255,0.1)",
              background: isSelected
                ? `linear-gradient(135deg, ${robot.color}15, ${robot.color}08)`
                : "rgba(255,255,255,0.02)",
              boxShadow: isSelected
                ? `0 0 20px ${robot.glow}, inset 0 0 20px ${robot.glow}`
                : "none",
            }}
          >
            {/* Icon circle */}
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
              style={{
                background: isSelected ? robot.color : `${robot.color}30`,
                color: isSelected ? "#0a0a1a" : robot.color,
              }}
            >
              {robot.icon}
            </div>

            {/* Text */}
            <div className="text-left">
              <div
                className="text-xs font-semibold leading-tight"
                style={{ color: isSelected ? robot.color : "#e0e0e0" }}
              >
                {robot.name}
              </div>
              <div className="text-[10px] text-zinc-500 leading-tight">
                {robot.description}
              </div>
            </div>

            {/* Active indicator */}
            {isSelected && (
              <div
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                style={{
                  background: robot.color,
                  boxShadow: `0 0 6px ${robot.color}`,
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
