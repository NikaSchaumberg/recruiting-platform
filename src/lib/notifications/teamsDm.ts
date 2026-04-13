/**
 * Send a private Teams chat message to an individual user via Microsoft Graph API.
 *
 * Required Azure app permissions (Application type, admin consent required):
 *   - User.Read.All             — resolve email addresses to AAD Object IDs
 *   - Chat.Create               — create oneOnOne chats
 *   - Chat.ReadWrite.All        — send messages into those chats
 *
 * Known limitation: AclCheckFailed (403) can occur even with correct permissions
 * if the tenant's Teams ACL policies block programmatic chat creation. In that case
 * the hiring manager email notification (sent independently) still delivers.
 */

import { getGraphToken } from '@/lib/email/graphEmail'

export interface TeamsDmParams {
  recipientEmail: string
  recipientName: string
  applicantName: string
  applicantEmail: string
  jobTitle: string
  score: number
  recommendation: string
  strengths: string[]
  dashboardUrl: string
}

function formatRecommendation(rec: string): string {
  const map: Record<string, string> = {
    strong_yes: '✅ Strong Yes',
    yes: '✅ Yes',
    maybe: '⚠️ Maybe',
    no: '❌ No',
  }
  return map[rec] ?? rec
}

function scoreEmoji(score: number): string {
  if (score >= 75) return '🟢'
  if (score >= 50) return '🟡'
  return '🔴'
}

/** Resolve a UPN/email to an AAD Object ID. Requires User.Read.All (Application). */
async function resolveUserId(token: string, email: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=id,displayName,userPrincipalName`
  console.log(`[TeamsDM] Resolving user ID for ${email} → GET ${url}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const raw = await res.text()
  console.log(`[TeamsDM] User lookup HTTP ${res.status}:`, raw.slice(0, 400))

  if (!res.ok) {
    const parsed = safeParseJson(raw)
    const msg = parsed?.error?.message ?? raw
    throw new Error(`[TeamsDM] Cannot resolve user "${email}": HTTP ${res.status} — ${msg}`)
  }

  const data = JSON.parse(raw)
  console.log(`[TeamsDM] Resolved ${email} → OID: ${data.id}, UPN: ${data.userPrincipalName}`)
  return data.id as string
}

interface GraphErrorResponse {
  error?: { code?: string; message?: string }
}

function safeParseJson(text: string): GraphErrorResponse | null {
  try { return JSON.parse(text) as GraphErrorResponse } catch { return null }
}

/**
 * Attempt 1: POST /v1.0/users/{senderOid}/chats (user-scoped endpoint)
 * Attempt 2: POST /v1.0/chats (root endpoint — may hit AclCheckFailed on some tenants)
 * Returns the chatId on success.
 */
async function getOrCreateOneOnOneChat(
  token: string,
  senderOid: string,
  recipientOid: string,
): Promise<string> {
  const membersBind = (oid: string) =>
    `https://graph.microsoft.com/v1.0/users('${oid}')`

  const body = {
    chatType: 'oneOnOne',
    members: [
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': membersBind(senderOid),
      },
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': membersBind(recipientOid),
      },
    ],
  }

  // Try user-scoped endpoint first, then root endpoint
  const endpoints = [
    `https://graph.microsoft.com/v1.0/users/${senderOid}/chats`,
    `https://graph.microsoft.com/v1.0/chats`,
  ]

  let lastError = ''
  for (const url of endpoints) {
    console.log(`[TeamsDM] POST ${url}`)
    console.log(`[TeamsDM] Request body:`, JSON.stringify(body, null, 2))

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const raw = await res.text()
    console.log(`[TeamsDM] HTTP ${res.status} from ${url}:`, raw)

    if (res.ok) {
      const data = JSON.parse(raw)
      console.log(`[TeamsDM] Chat created/retrieved — ID: ${data.id}`)
      return data.id as string
    }

    const parsed = safeParseJson(raw)
    const errCode = parsed?.error?.code ?? '?'
    const errMsg = parsed?.error?.message ?? raw

    if (res.status === 403) {
      console.error(`[TeamsDM] ❌ 403 ${errCode} on ${url}: ${errMsg}`)
      if (String(errCode) === 'AclCheckFailed') {
        console.error('[TeamsDM] AclCheckFailed — this is a tenant Teams ACL policy restriction.')
        console.error('[TeamsDM] The app has the right Graph permissions but the tenant policy blocks')
        console.error('[TeamsDM] programmatic oneOnOne chat creation. To fix, ask a Teams admin to run:')
        console.error('[TeamsDM]   Set-CsTeamsMessagingPolicy -AllowUserChat $true')
        console.error('[TeamsDM] Or grant the app the Chat.Create permission AND ensure the sender')
        console.error('[TeamsDM] account (GRAPH_SENDER_EMAIL) has a Teams license and is active.')
      }
    }

    lastError = `HTTP ${res.status} (${errCode}): ${errMsg}`
  }

  throw new Error(`[TeamsDM] All chat creation attempts failed. Last error: ${lastError}`)
}

/** Post a message to a Teams chat. chatId must NOT be URI-encoded. */
async function postChatMessage(token: string, chatId: string, html: string): Promise<void> {
  const url = `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`
  console.log(`[TeamsDM] POST ${url}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: { contentType: 'html', content: html } }),
  })

  const raw = await res.text()
  console.log(`[TeamsDM] Message send HTTP ${res.status}:`, raw.slice(0, 400))

  if (!res.ok) {
    const parsed = safeParseJson(raw)
    const detail = `HTTP ${res.status} (${parsed?.error?.code ?? '?'}): ${parsed?.error?.message ?? raw}`
    throw new Error(`[TeamsDM] Message send failed: ${detail}`)
  }
}

export async function sendTeamsDm(params: TeamsDmParams): Promise<void> {
  const senderEmail = process.env.GRAPH_SENDER_EMAIL
  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  console.log('[TeamsDM] Config:', {
    GRAPH_SENDER_EMAIL: senderEmail ?? '(MISSING)',
    AZURE_TENANT_ID: tenantId ? '✓' : '(MISSING)',
    AZURE_CLIENT_ID: clientId ? '✓' : '(MISSING)',
    AZURE_CLIENT_SECRET: clientSecret ? '✓' : '(MISSING)',
    recipientEmail: params.recipientEmail,
  })

  if (!senderEmail) throw new Error('[TeamsDM] GRAPH_SENDER_EMAIL not configured')
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('[TeamsDM] Missing Azure credentials')
  }

  const token = await getGraphToken()
  console.log('[TeamsDM] Graph token acquired ✓')

  // Resolve emails → AAD Object IDs (avoids UPN-based ACL issues in some tenants)
  const [senderOid, recipientOid] = await Promise.all([
    resolveUserId(token, senderEmail),
    resolveUserId(token, params.recipientEmail),
  ])

  const chatId = await getOrCreateOneOnOneChat(token, senderOid, recipientOid)

  const top3 = params.strengths.slice(0, 3)
  const html = [
    `<p><strong>🤖 New candidate screened for <em>${params.jobTitle}</em></strong></p>`,
    `<table>`,
    `  <tr><td><strong>Candidate</strong></td><td>${params.applicantName} (${params.applicantEmail})</td></tr>`,
    `  <tr><td><strong>AI Score</strong></td><td>${scoreEmoji(params.score)} ${params.score}/100</td></tr>`,
    `  <tr><td><strong>Recommendation</strong></td><td>${formatRecommendation(params.recommendation)}</td></tr>`,
    `</table>`,
    top3.length > 0
      ? `<p><strong>Top strengths:</strong><br>${top3.map((s) => `• ${s}`).join('<br>')}</p>`
      : '',
    `<p><a href="${params.dashboardUrl}">👉 View full profile in dashboard</a></p>`,
  ].join('\n')

  await postChatMessage(token, chatId, html)
  console.log(`[TeamsDM] ✓ Message delivered to ${params.recipientEmail}`)
}
