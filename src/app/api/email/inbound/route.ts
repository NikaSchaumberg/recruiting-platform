export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { processInboundEmail } from '@/lib/email/inboundProcessor'

/**
 * POST /api/email/inbound
 *
 * General-purpose inbound email endpoint. Accepts email data, matches it to
 * a candidate application, and stores it. Secured with X-Webhook-Secret header.
 *
 * Body:
 *   { from, fromName?, subject, body, receivedAt?, graphMessageId? }
 */
export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret')
  const expected = process.env.WEBHOOK_SECRET

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Record<string, string>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { from, fromName, subject, body, receivedAt, graphMessageId } = payload

  if (!from || !subject || !body) {
    return NextResponse.json(
      { error: 'from, subject, and body are required' },
      { status: 400 }
    )
  }

  try {
    const result = await processInboundEmail({
      fromEmail: from,
      fromName,
      subject,
      body,
      receivedAt,
      graphMessageId,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[inbound] Unhandled error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
