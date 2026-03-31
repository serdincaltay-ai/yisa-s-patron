/**
 * YİSA-S Orkestrasyon Motoru
 * Zincirdeki adımları sırayla çalıştırır, her adımın çıktısını
 * bir sonrakine girdi olarak aktarır.
 */

import type {
  OrchestrationChain,
  ChainExecution,
  StepExecution,
  ChainStatus,
  AgentId,
} from "./types"
import { createExecution, updateExecution } from "./store"
import {
  callGemini,
  callGPT,
  callClaude,
  callTogether,
  callFalAI,
  callV0,
  callCursor,
  callGitHub,
} from "@/lib/ai-providers"

/** Benzersiz kimlik üreteci */
function generateId(): string {
  return `orch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/** Prompt şablonundaki {{input}} placeholder'ını değerle değiştir */
function resolvePrompt(template: string, input: string): string {
  return template.replace(/\{\{input\}\}/g, () => input)
}

/** CelfOutput sonucunun hata/stub olup olmadığını kontrol et */
function isCelfOutputFailure(plan: string): boolean {
  return plan.startsWith("STUB") || plan.startsWith("Hata")
}

/**
 * Tek bir ajan adımını çalıştır.
 * Agent ID'ye göre doğru provider'ı çağırır.
 * Soft failure durumlarında (API key yok, hata yanıtı) Error fırlatır.
 */
async function executeAgent(
  agentId: AgentId,
  prompt: string
): Promise<{ output: string; outputUrl: string | null }> {
  switch (agentId) {
    case "gemini": {
      const result = await callGemini(prompt)
      if (isCelfOutputFailure(result.plan)) throw new Error(`Gemini: ${result.plan}`)
      return { output: result.plan, outputUrl: result.gorsel_url ?? null }
    }
    case "gpt": {
      const result = await callGPT(prompt)
      if (isCelfOutputFailure(result.plan)) throw new Error(`GPT: ${result.plan}`)
      return { output: result.plan, outputUrl: null }
    }
    case "claude": {
      const result = await callClaude(prompt)
      if (isCelfOutputFailure(result.plan)) throw new Error(`Claude: ${result.plan}`)
      return { output: result.plan, outputUrl: null }
    }
    case "together": {
      const result = await callTogether(prompt)
      if (isCelfOutputFailure(result.plan)) throw new Error(`Together: ${result.plan}`)
      return { output: result.plan, outputUrl: null }
    }
    case "fal": {
      const result = await callFalAI(prompt)
      if (isCelfOutputFailure(result.plan)) throw new Error(`Fal AI: ${result.plan}`)
      return { output: result.plan, outputUrl: result.gorsel_url ?? null }
    }
    case "v0": {
      const result = await callV0(prompt)
      if (!result.success) throw new Error("V0: Sonuç üretilemedi")
      return {
        output: result.code ?? result.url ?? "V0 sonuç üretemedi",
        outputUrl: result.url ?? null,
      }
    }
    case "cursor": {
      const result = await callCursor(prompt)
      if (isCelfOutputFailure(result.plan)) throw new Error(`Cursor: ${result.plan}`)
      return { output: result.plan, outputUrl: null }
    }
    case "github": {
      const result = await callGitHub("create_file", {
        owner: process.env.GITHUB_OWNER ?? "serdincaltay-ai",
        repo: process.env.GITHUB_REPO ?? "app-yisa-s",
        path: `generated/orchestration-${Date.now()}.md`,
        content: prompt,
        message: "feat: orchestration output",
      })
      if (!result.success) throw new Error("GitHub: Commit başarısız")
      return {
        output: "GitHub commit başarılı",
        outputUrl: result.url ?? null,
      }
    }
    case "vercel": {
      return { output: "Vercel deploy tetiklendi (stub)", outputUrl: null }
    }
    default: {
      throw new Error(`Bilinmeyen ajan: ${agentId as string}`)
    }
  }
}

/**
 * Bir orkestrasyon zincirini başlat ve arka planda çalıştır.
 * Hemen execution_id döner, adımlar asenkron olarak işlenir.
 */
export function startChainExecution(
  chain: OrchestrationChain,
  userInput: string
): ChainExecution {
  const executionId = generateId()
  const now = new Date().toISOString()

  const steps: StepExecution[] = chain.steps.map((s) => ({
    step_id: s.step_id,
    agent_id: s.agent_id,
    label: s.label,
    status: "pending",
    output_type: s.output_type,
    output: null,
    output_url: null,
    error: null,
    started_at: null,
    finished_at: null,
  }))

  const execution: ChainExecution = {
    execution_id: executionId,
    chain_id: chain.chain_id,
    chain_name: chain.name,
    user_input: userInput,
    status: "running",
    steps,
    started_at: now,
    finished_at: null,
    total_steps: chain.steps.length,
    completed_steps: 0,
  }

  createExecution(execution)

  // Arka planda zinciri çalıştır (await etmiyoruz, fire-and-forget)
  runChainSteps(executionId, chain, userInput).catch((err) => {
    console.error("[Orchestration] Chain execution error:", err)
    updateExecution(executionId, (exec) => ({
      ...exec,
      status: "failed" as ChainStatus,
      finished_at: new Date().toISOString(),
    }))
  })

  return execution
}

/**
 * Zincirdeki adımları sırayla çalıştır.
 * Her adımın çıktısı bir sonraki adıma girdi olarak aktarılır.
 */
async function runChainSteps(
  executionId: string,
  chain: OrchestrationChain,
  userInput: string
): Promise<void> {
  /** Adım çıktıları: step_id → output */
  const outputs = new Map<string, string>()

  for (let i = 0; i < chain.steps.length; i++) {
    const stepDef = chain.steps[i]

    // Adımı "running" olarak işaretle
    updateExecution(executionId, (exec) => ({
      ...exec,
      steps: exec.steps.map((s) =>
        s.step_id === stepDef.step_id
          ? { ...s, status: "running", started_at: new Date().toISOString() }
          : s
      ),
    }))

    // Girdi belirle
    const inputValue =
      stepDef.input_from === null
        ? userInput
        : outputs.get(stepDef.input_from) ?? userInput

    const prompt = resolvePrompt(stepDef.prompt_template, inputValue)

    try {
      const { output, outputUrl } = await executeAgent(stepDef.agent_id, prompt)

      outputs.set(stepDef.step_id, output)

      // Adımı "completed" olarak işaretle
      updateExecution(executionId, (exec) => ({
        ...exec,
        completed_steps: exec.completed_steps + 1,
        steps: exec.steps.map((s) =>
          s.step_id === stepDef.step_id
            ? {
                ...s,
                status: "completed",
                output,
                output_url: outputUrl,
                finished_at: new Date().toISOString(),
              }
            : s
        ),
      }))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      // Adımı "failed" olarak işaretle
      updateExecution(executionId, (exec) => ({
        ...exec,
        status: "failed",
        finished_at: new Date().toISOString(),
        steps: exec.steps.map((s) =>
          s.step_id === stepDef.step_id
            ? {
                ...s,
                status: "failed",
                error: errorMsg,
                finished_at: new Date().toISOString(),
              }
            : s
        ),
      }))

      // Zincir başarısız oldu, kalan adımları atla
      return
    }
  }

  // Tüm adımlar tamamlandı
  updateExecution(executionId, (exec) => ({
    ...exec,
    status: "completed",
    finished_at: new Date().toISOString(),
  }))
}
