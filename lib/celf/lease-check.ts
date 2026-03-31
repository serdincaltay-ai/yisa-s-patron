/**
 * C2 Lease Expire Kontrolü
 * status=locked ve lease_expires_at < now() olanları queued yapar
 */

import { createClient } from "@supabase/supabase-js"

export async function runLeaseExpireCheck(): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return 0

  const supabase = createClient(url, key)

  const { data: expired } = await supabase
    .from("celf_tasks")
    .select("id")
    .eq("status", "locked")
    .lt("lease_expires_at", new Date().toISOString())

  if (!expired || expired.length === 0) return 0

  const ids = expired.map((r) => r.id)
  await supabase
    .from("celf_tasks")
    .update({
      status: "queued",
      lock_owner_user_id: null,
      locked_at: null,
      lease_expires_at: null,
    })
    .in("id", ids)

  for (const id of ids) {
    await supabase.from("celf_events").insert({
      task_id: id,
      event_type: "LEASE_EXPIRED",
      meta: {},
    })
  }

  return ids.length
}
