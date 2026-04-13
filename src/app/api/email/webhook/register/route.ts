export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureSubscription, listSubscriptions } from '@/lib/email/graphSubscription'

/**
 * POST /api/email/webhook/register
 *
 * Idempotent: renews the existing Graph subscription if one is found,
 * otherwise creates a new one. Admin-only.
 *
 * Required Graph app permission: Mail.Read (application)
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL || !process.env.GRAPH_SENDER_EMAIL || !process.env.WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_BASE_URL, GRAPH_SENDER_EMAIL, and WEBHOOK_SECRET must be set' },
      { status: 500 }
    )
  }

  try {
    const result = await ensureSubscription()
    console.log(`[webhook/register] ${result.action} — ${result.subscription.id}`)
    return NextResponse.json({
      success: true,
      action: result.action,
      subscriptionId: result.subscription.id,
      expiresAt: result.subscription.expirationDateTime,
      notificationUrl: result.subscription.notificationUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook/register] Failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/email/webhook/register
 * List all active Graph subscriptions. Admin-only.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  try {
    const subscriptions = await listSubscriptions()
    return NextResponse.json({ value: subscriptions })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
