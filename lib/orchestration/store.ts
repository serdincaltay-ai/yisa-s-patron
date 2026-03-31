/**
 * YİSA-S Orkestrasyon Durum Deposu
 * Çalışan zincirlerin durumlarını bellekte tutar.
 * (Üretimde Supabase/Redis'e taşınabilir.)
 */

import type { ChainExecution } from "./types"

/** Bellekte tutulan çalıştırma kayıtları (execution_id → ChainExecution) */
const executions = new Map<string, ChainExecution>()

/** Maksimum saklanan kayıt (bellek taşmasını önler) */
const MAX_ENTRIES = 500

/** Yeni bir çalıştırma kaydı oluştur */
export function createExecution(exec: ChainExecution): void {
  if (executions.size >= MAX_ENTRIES) {
    const oldest = executions.keys().next().value
    if (oldest !== undefined) executions.delete(oldest)
  }
  executions.set(exec.execution_id, exec)
}

/** Çalıştırma kaydını getir */
export function getExecution(executionId: string): ChainExecution | null {
  return executions.get(executionId) ?? null
}

/** Çalıştırma kaydını güncelle */
export function updateExecution(
  executionId: string,
  updater: (exec: ChainExecution) => ChainExecution
): ChainExecution | null {
  const existing = executions.get(executionId)
  if (!existing) return null
  const updated = updater(existing)
  executions.set(executionId, updated)
  return updated
}

/** Tüm çalıştırmaları listele (en yeniden eskiye) */
export function listExecutions(limit = 20): ChainExecution[] {
  const all = Array.from(executions.values())
  all.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  return all.slice(0, limit)
}
