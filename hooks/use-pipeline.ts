"use client"

import { useState, useCallback } from "react"

// ==================== PIPELINE TYPES ====================

export type PipelineStage = "idle" | "konus" | "onizle" | "onay" | "uygula"

export interface PipelineState {
  /** Current active stage */
  stage: PipelineStage
  /** Stages that have been completed */
  completedStages: PipelineStage[]
  /** Timestamp when stage changed */
  stageChangedAt: number
  /** Optional label for current activity */
  stageLabel: string | null
}

export const PIPELINE_STAGES: {
  key: PipelineStage
  label: string
  description: string
  color: string
}[] = [
  {
    key: "konus",
    label: "Konuş",
    description: "Patron fikirlerini paylaşıyor",
    color: "#00d4ff",
  },
  {
    key: "onizle",
    label: "Önizle",
    description: "AI cevap üretiyor, patron önizliyor",
    color: "#818cf8",
  },
  {
    key: "onay",
    label: "Onay",
    description: "Patron karar veriyor",
    color: "#f59e0b",
  },
  {
    key: "uygula",
    label: "Uygula",
    description: "CELF motoru uyguluyor",
    color: "#10b981",
  },
]

const INITIAL_STATE: PipelineState = {
  stage: "idle",
  completedStages: [],
  stageChangedAt: Date.now(),
  stageLabel: null,
}

// ==================== HOOK ====================

export function usePipeline() {
  const [pipeline, setPipeline] = useState<PipelineState>(INITIAL_STATE)

  const goToStage = useCallback((stage: PipelineStage, label?: string) => {
    setPipeline((prev) => {
      const completed = [...prev.completedStages]

      // Mark the previous stage as completed if it was active
      if (prev.stage !== "idle" && prev.stage !== stage && !completed.includes(prev.stage)) {
        completed.push(prev.stage)
      }

      return {
        stage,
        completedStages: completed,
        stageChangedAt: Date.now(),
        stageLabel: label ?? null,
      }
    })
  }, [])

  const resetPipeline = useCallback(() => {
    setPipeline({
      stage: "idle",
      completedStages: [],
      stageChangedAt: Date.now(),
      stageLabel: null,
    })
  }, [])

  const isStageCompleted = useCallback(
    (stage: PipelineStage) => pipeline.completedStages.includes(stage),
    [pipeline.completedStages]
  )

  const isStageActive = useCallback(
    (stage: PipelineStage) => pipeline.stage === stage,
    [pipeline.stage]
  )

  return {
    pipeline,
    goToStage,
    resetPipeline,
    isStageCompleted,
    isStageActive,
  }
}
