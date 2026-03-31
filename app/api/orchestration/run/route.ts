import { NextResponse } from "next/server"
import {
  getChainTemplate,
  detectChainFromCommand,
  startChainExecution,
  CHAIN_TEMPLATES,
} from "@/lib/orchestration"
import type { RunChainRequest, RunChainResponse } from "@/lib/orchestration"
import { requirePatron } from "@/lib/celf/patron-auth"

/**
 * POST /api/orchestration/run
 * Bir orkestrasyon zincirini başlatır.
 *
 * Body:
 *   { chain_id?: string, user_input: string }
 *
 * chain_id verilmezse, user_input'tan otomatik zincir seçilir.
 */
export async function POST(request: Request) {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  try {
    const body = (await request.json()) as Partial<RunChainRequest>

    if (!body.user_input?.trim()) {
      return NextResponse.json(
        { error: "user_input gerekli" },
        { status: 400 }
      )
    }

    const userInput = body.user_input.trim()

    // Zincir belirle: explicit chain_id veya otomatik tespit
    let chain: ReturnType<typeof getChainTemplate> = undefined

    if (body.chain_id) {
      chain = getChainTemplate(body.chain_id)
      if (!chain) {
        return NextResponse.json(
          {
            error: `chain_id '${body.chain_id}' bulunamadı`,
            available_chains: CHAIN_TEMPLATES.map((c) => ({
              chain_id: c.chain_id,
              name: c.name,
              description: c.description,
            })),
          },
          { status: 404 }
        )
      }
    } else {
      chain = detectChainFromCommand(userInput) ?? undefined
    }

    if (!chain) {
      return NextResponse.json(
        {
          error: "Uygun zincir bulunamadı. Lütfen chain_id belirtin.",
          available_chains: CHAIN_TEMPLATES.map((c) => ({
            chain_id: c.chain_id,
            name: c.name,
            description: c.description,
          })),
        },
        { status: 400 }
      )
    }

    // Zinciri başlat
    const execution = startChainExecution(chain, userInput)

    const response: RunChainResponse = {
      execution_id: execution.execution_id,
      chain_name: execution.chain_name,
      total_steps: execution.total_steps,
      status: execution.status,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error("[Orchestration Run]", err)
    return NextResponse.json(
      { error: "Orkestrasyon başlatılamadı" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orchestration/run
 * Mevcut zincir şablonlarını listeler.
 */
export async function GET() {
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: "Patron girişi gerekli" }, { status: 401 })

  return NextResponse.json({
    chains: CHAIN_TEMPLATES.map((c) => ({
      chain_id: c.chain_id,
      name: c.name,
      description: c.description,
      steps: c.steps.map((s) => ({
        step_id: s.step_id,
        agent_id: s.agent_id,
        label: s.label,
        output_type: s.output_type,
      })),
    })),
  })
}
