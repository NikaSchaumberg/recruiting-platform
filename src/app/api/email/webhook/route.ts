export const runtime = 'nodejs'

import { type NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { fetchGraphMessage, cleanEnv } from '@/lib/email/graphEmail'
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
    console.log('[webhook] Graph validation handshake — responding with token')
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
    console.warn('[webhook] Malformed JSON body — acknowledging to prevent Graph retries')
    return new Response(null, { status: 202 })
  }

  const notifications = payload?.value ?? []
  const expectedSecret = process.env.WEBHOOK_SECRET
  const senderMailbox = cleanEnv(process.env.GRAPH_SENDER_EMAIL)

  console.log(`[webhook] Received ${notifications.length} notification(s). GRAPH_SENDER_EMAIL="${senderMailbox ?? '(not set)'}"`)

  if (notifications.length === 0) {
    return new Response(null, { status: 202 })
  }

  // Return 202 immediately — process in background via after()
  after(async () => {
    for (const notification of notifications) {
      console.log(`[webhook] Notification id=${notification.id} changeType=${notification.changeType} subscriptionId=${notification.subscriptionId}`)

      // Verify clientState to ensure the request is from our subscription
      if (expectedSecret && notification.clientState !== expectedSecret) {
        console.warn(`[webhook] ✗ clientState mismatch on notification ${notification.id} — expected secret doesn't match. Check WEBHOOK_SECRET env var.`)
        continue
      }

      if (notification.changeType !== 'created') {
        console.log(`[webhook] Skipping changeType="${notification.changeType}" (only process "created")`)
        continue
      }

      const messageId = notification.resourceData?.id
      if (!messageId) {
        console.warn('[webhook] Notification missing resourceData.id — cannot fetch message')
        continue
      }

      console.log(`[webhook] Fetching Graph message id=${messageId} from mailbox="${senderMailbox}"`)

      try {
        const message = await fetchGraphMessage(messageId)
        if (!message) {
          console.warn(`[webhook] Message ${messageId} not found in mailbox "${senderMailbox}". ` +
            `The subscription may be watching a different mailbox than GRAPH_SENDER_EMAIL. ` +
            `Check subscription resource vs current GRAPH_SENDER_EMAIL.`)
          continue
        }

        console.log(`[webhook] Fetched message — subject="${message.subject}" from="${message.from.emailAddress.address}" receivedAt="${message.receivedDateTime}"`)

        await processInboundEmail({
          fromEmail: message.from.emailAddress.address,
          fromName: message.from.emailAddress.name,
          subject: message.subject ?? '(no subject)',
          body: message.body.content,
          receivedAt: message.receivedDateTime,
          graphMessageId: message.id,
        })
      } catch (err) {
        console.error(`[webhook] Failed to process message ${messageId}:`, err instanceof Error ? err.message : err)
      }
    }
  })

  return new Response(null, { status: 202 })
}
