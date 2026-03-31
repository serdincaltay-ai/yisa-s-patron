// app/api/brain-team/distribute-tasks/route.ts
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requirePatron } from "@/lib/celf/patron-auth"
import { withErrorHandling, AuthenticationError, ValidationError, NotFoundError } from "@/lib/errors"
import { DIRECTORATE_AI_MAP } from "@/lib/celf-directorate-config"
import { callTogether } from "@/lib/ai-providers"

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ok = await requirePatron()
    if (!ok) throw new AuthenticationError("Patron oturumu gerekli")

    const body = await request.json().catch(() => ({}))
    const epic_id = body?.epic_id
    if (!epic_id) {
      throw new ValidationError("epic_id zorunludur")
    }

    const supabase = createAdminClient()

    const { data: epic, error: epicError } = await supabase
      .from("celf_epics")
      .select("*")
      .eq("id", epic_id)
      .single()

    if (epicError || !epic) {
      throw new NotFoundError("Epic bulunamadı")
    }

    const directorates = Array.isArray(epic.parsed_directorates)
      ? (epic.parsed_directorates as string[])
      : []
    const tasks: unknown[] = []
    const patron_command = (epic.patron_command as string) ?? ""

    for (const directorate of directorates) {
      const aiProvider = DIRECTORATE_AI_MAP[directorate] ?? "gpt"

      const costPrompt = `Direktörlük: ${directorate}, Komut: ${patron_command}. Tahmini token maliyeti? Sadece sayı ver (örn: 2500)`
      const costResult = await callTogether(
        costPrompt,
        "Sen maliyet analiz uzmanısın."
      )
      let tokenCost = 1000
      try {
        const costText =
          typeof costResult?.plan === "string"
            ? costResult.plan.match(/\d+/)
            : null
        if (costText?.[0]) tokenCost = parseInt(costText[0], 10)
      } catch {
        // keep 1000
      }
      const tokenCostDollar = tokenCost * 0.00002

      const { data: task, error: taskError } = await supabase
        .from("celf_tasks")
        .insert({
          epic_id,
          directorate,
          ai_provider: aiProvider,
          task_description: `${directorate} direktörlüğü için: ${patron_command}`,
          status: "queued",
          token_cost: tokenCostDollar,
          output_type: "json",
        })
        .select()
        .single()

      if (!taskError && task) tasks.push(task)
    }

    await supabase
      .from("celf_epics")
      .update({
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", epic_id)

    return NextResponse.json({
      ok: true,
      epic_id,
      tasks_created: tasks.length,
      tasks,
    })
  })
}
