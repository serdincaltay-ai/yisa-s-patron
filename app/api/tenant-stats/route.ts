import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { requirePatron } = await import('@/lib/celf/patron-auth')
  const ok = await requirePatron()
  if (!ok) return NextResponse.json({ error: 'Patron oturumu gerekli' }, { status: 401 })

  try {
    const supabase = createAdminClient()

    const { count: total } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    const { count: active } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aktif')

    return NextResponse.json({
      total: total ?? 0,
      active: active ?? 0,
    })
  } catch {
    return NextResponse.json({ total: 0, active: 0 }, { status: 500 })
  }
}
