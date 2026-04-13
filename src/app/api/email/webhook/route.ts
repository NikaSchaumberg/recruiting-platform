export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { fetchGraphMessage } from '@/lib/email/graphEmail'
import { processInboundEmail } from '@/lib/email/inboundProcessor'

interface GraphNotification {
  id: string
  changeType: string
  clientState?: string
  resource: string
  resourceData?: {
    id: string
    '@odata.type': string
    '@odata.id': string
  }
  subscriptionId: string
  tenantId: string
}

interface GraphNotificationPayload {
  value: GraphNotification[]
}

/**
 * POST /api/email/webhook
 *
 * Microsoft Graph change notification endpoint.
 *
 * Two flows:
 *  1. Validation handshake — Graph sends ?validationToken=<token>
 *     We must echo it back as plain text with 200 within 10 s.
 *
 *  2. Change notification — Graph sends JSON body with email change events.
 *     We return 202 immediately, then process asynchronously via after().
 */
export async function POST(request: NextRequest) {
  // ── 1. Validation handshake ──────────────────────────────────────────────
  const validationToken = request.nextUrl.searchParams.get('validationToken')
  if (validationToken) {
    console.log('[webhook] Validation handshake received')
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // ── 2. Change notification ───────────────────────────────────────────────
  let payload: GraphNotificationPayload
  try {
    payload = await request.json()
  } catch {
    // Malformed body — acknowledge anyway so Graph doesn't retry forever
    return new Response(null, { status: 202 })
  }

  const notifications = payload?.value ?? []
  const expectedSecret = process.env.WEBHOOK_SECRET

  // Return 202 immediately — process in background via after()
  after(async () => {
    for (const notification of notifications) {
      // Verify clientState to ensure the request is from our subscription
      if (expectedSecret && notification.clientState !== expectedSecret) {
        console.warn(`[webhook] clientState mismatch on notification ${notification.id}, skipping`)
        continue
      }

      if (notification.changeType !== 'created') continue

      const messageId = notification.resourceData?.id
      if (!messageId) {
        console.warn('[webhook] Notification missing resourceData.id')
        continue
      }

      try {
        const message = await fetchGraphMessage(messageId)
        if (!message) {
          console.log(`[webhook] Message ${messageId} not found (deleted before fetch?)`)
          continue
        }

        await processInboundEmail({
          fromEmail: message.from.emailAddress.address,
          fromName: message.from.emailAddress.name,
          subject: message.subject ?? '(no subject)',
          body: message.body.content,
          receivedAt: message.receivedDateTime,
          graphMessageId: message.id,
        })
      } catch (err) {
        console.error(`[webhook] Failed to process message ${messageId}:`, err)
      }
    }
  })

  return new Response(null, { status: 202 })
}
