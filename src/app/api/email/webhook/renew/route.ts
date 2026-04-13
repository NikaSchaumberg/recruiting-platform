export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { ensureSubscription } from '@/lib/email/graphSubscription'

/**
 * GET /api/email/webhook/renew
 *
 * Called by the Vercel cron job every 2 days to ensure the Graph mail
 * subscription for hr@exxircapital.com stays active.
 *
 * Auth: Vercel automatically sends  Authorization: Bearer <CRON_SECRET>
 * with every cron invocation. The same header is required for manual calls.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.AZURE_TENANT_ID || !process.env.GRAPH_SENDER_EMAIL || !process.env.NEXT_PUBLIC_BASE_URL) {
    return NextResponse.json(
      { error: 'Graph env vars not configured (AZURE_TENANT_ID, GRAPH_SENDER_EMAIL, NEXT_PUBLIC_BASE_URL)' },
      { status: 500 }
    )
  }

  try {
    const result = await ensureSubscription()
    console.log(`[cron/renew] ${result.action} — subscription ${result.subscription.id}, expires ${result.subscription.expirationDateTime}`)
    return NextResponse.json({
      action: result.action,
      subscriptionId: result.subscription.id,
      expiresAt: result.subscription.expirationDateTime,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/renew] Failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
