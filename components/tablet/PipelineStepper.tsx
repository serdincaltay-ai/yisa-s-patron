"use client"

import type { LucideIcon } from "lucide-react"
import { MessageSquare, Eye, CheckCircle, Zap, Check } from "lucide-react"
import type { PipelineStage } from "@/hooks/use-pipeline"
import { PIPELINE_STAGES } from "@/hooks/use-pipeline"

const STAGE_ICONS: Record<string, LucideIcon> = {
  konus: MessageSquare,
  onizle: Eye,
  onay: CheckCircle,
  uygula: Zap,
}

interface PipelineStepperProps {
  currentStage: PipelineStage
  completedStages: PipelineStage[]
  /** Compact mode for header bar */
  compact?: boolean
}

export default function PipelineStepper({
  currentStage,
  completedStages,
  compact = false,
}: PipelineStepperProps) {
  if (currentStage === "idle") return null

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-0.5"}`}>
      {PIPELINE_STAGES.map((stage, idx) => {
        const isCompleted = completedStages.includes(stage.key)
        const isActive = currentStage === stage.key
        const isPending = !isCompleted && !isActive
        const Icon = STAGE_ICONS[stage.key] ?? MessageSquare

        return (
          <div key={stage.key} className="flex items-center">
            {/* Connector line */}
            {idx > 0 && (
              <div
                className={`h-[2px] transition-all duration-500 ${compact ? "w-4" : "w-6"} mx-0.5`}
                style={{
                  backgroundColor: isCompleted || isActive
                    ? stage.color + "80"
                    : "#1a1a2e",
                }}
              />
            )}

            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`
                  relative flex items-center justify-center rounded-full transition-all duration-500
                  ${compact ? "w-6 h-6" : "w-8 h-8"}
                  ${isActive ? "ring-2 ring-offset-1 ring-offset-[#0a0a1a]" : ""}
                `}
                style={{
                  backgroundColor: isCompleted
                    ? stage.color + "25"
                    : isActive
                      ? stage.color + "20"
                      : "#0f0f2a",
                  borderWidth: 1.5,
                  borderColor: isCompleted
                    ? stage.color + "60"
                    : isActive
                      ? stage.color
                      : "#1a1a2e",
                  boxShadow: isActive
                    ? `0 0 12px ${stage.color}30, 0 0 4px ${stage.color}20`
                    : "none",
                }}
              >
                {isCompleted ? (
                  <Check
                    size={compact ? 10 : 14}
                    style={{ color: stage.color }}
                    className="transition-all duration-300"
                  />
                ) : (
                  <Icon
                    size={compact ? 10 : 14}
                    className={`transition-all duration-300 ${
                      isActive ? "animate-pulse" : ""
                    }`}
                    style={{
                      color: isActive ? stage.color : isPending ? "#8892a8" + "60" : stage.color,
                    }}
                  />
                )}

                {/* Active pulse ring */}
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ backgroundColor: stage.color }}
                  />
                )}
              </div>

              {/* Label */}
              {!compact && (
                <span
                  className="text-[8px] font-mono font-bold tracking-wider transition-all duration-300"
                  style={{
                    color: isCompleted
                      ? stage.color
                      : isActive
                        ? stage.color
                        : "#8892a8" + "60",
                  }}
                >
                  {stage.label}
                </span>
              )}
            </div>
          </div>
        )
      })}

      {/* Compact: show current stage label */}
      {compact && (
        <span
          className="text-[8px] font-mono font-bold ml-1.5 tracking-wider"
          style={{
            color: PIPELINE_STAGES.find((s) => s.key === currentStage)?.color ?? "#8892a8",
          }}
        >
          {PIPELINE_STAGES.find((s) => s.key === currentStage)?.label ?? ""}
        </span>
      )}
    </div>
  )
}
