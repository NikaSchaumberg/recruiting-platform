import { getGraphToken, cleanEnv } from './graphEmail'

// Graph mail subscriptions max out at 4,230 minutes (~3 days).
// We target 3 days minus 5 minutes for the expiry we request.
const EXPIRY_MS = (3 * 24 * 60 - 5) * 60 * 1000

// Renew when less than 6 hours remain, so the cron running every 2 days
// always has a comfortable buffer.
const RENEW_THRESHOLD_MS = 6 * 60 * 60 * 1000

export interface GraphSubscription {
  id: string
  resource: string
  changeType: string
  notificationUrl: string
  expirationDateTime: string
  clientState?: string
}

function notificationUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_BASE_URL is not set')
  return `${base}/api/email/webhook`
}

function inboxResource(): string {
  const mailbox = cleanEnv(process.env.GRAPH_SENDER_EMAIL)
  if (!mailbox) throw new Error('GRAPH_SENDER_EMAIL is not set')
  return `users/${mailbox}/mailFolders/inbox/messages`
}

export async function listSubscriptions(): Promise<GraphSubscription[]> {
  const token = await getGraphToken()
  const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`listSubscriptions failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return (data.value ?? []) as GraphSubscription[]
}

export async function createSubscription(): Promise<GraphSubscription> {
  const token = await getGraphToken()
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()

  const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changeType: 'created',
      notificationUrl: notificationUrl(),
      resource: inboxResource(),
      expirationDateTime: expiresAt,
      clientState: process.env.WEBHOOK_SECRET,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(
      `createSubscription failed: ${res.status} — ${data?.error?.message ?? JSON.stringify(data)}`
    )
  }
  return data as GraphSubscription
}

export async function renewSubscription(subscriptionId: string): Promise<GraphSubscription> {
  const token = await getGraphToken()
  const expiresAt = new Date(Date.now() + EXPIRY_MS).toISOString()

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expirationDateTime: expiresAt }),
    }
  )

  const data = await res.json()
  if (!res.ok) {
    throw new Error(
      `renewSubscription failed: ${res.status} — ${data?.error?.message ?? JSON.stringify(data)}`
    )
  }
  return data as GraphSubscription
}

export type EnsureAction = 'ok' | 'renewed' | 'created'

/**
 * Idempotent: lists existing Graph subscriptions, renews ours if it's
 * expiring soon, creates it from scratch if it doesn't exist.
 * Safe to call on every server cold-start.
 */
export async function ensureSubscription(): Promise<{
  action: EnsureAction
  subscription: GraphSubscription
}> {
  const url = notificationUrl()
  const subscriptions = await listSubscriptions()

  // Match on notification URL so we don't touch unrelated subscriptions
  const ours = subscriptions.find((s) => s.notificationUrl === url)

  if (ours) {
    const expiresAt = new Date(ours.expirationDateTime).getTime()
    const timeLeft = expiresAt - Date.now()

    if (timeLeft > RENEW_THRESHOLD_MS) {
      console.log(
        `[graphSubscription] Active — expires ${ours.expirationDateTime} (${Math.round(timeLeft / 3600000)}h left)`
      )
      return { action: 'ok', subscription: ours }
    }

    console.log(`[graphSubscription] Renewing — only ${Math.round(timeLeft / 3600000)}h left`)
    const renewed = await renewSubscription(ours.id)
    console.log(`[graphSubscription] Renewed until ${renewed.expirationDateTime}`)
    return { action: 'renewed', subscription: renewed }
  }

  console.log('[graphSubscription] No subscription found — creating')
  const created = await createSubscription()
  console.log(`[graphSubscription] Created ${created.id}, expires ${created.expirationDateTime}`)
  return { action: 'created', subscription: created }
}
