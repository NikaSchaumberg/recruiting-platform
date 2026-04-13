/**
 * Send a private Teams chat message to an individual user via Microsoft Graph API.
 *
 * Required Azure app permissions (Application type, admin consent required):
 *   - Chat.Create              — create oneOnOne chats between two users
 *   - Chat.ReadWrite.All       — send messages into those chats
 *
 * The message appears in the chat between GRAPH_SENDER_EMAIL and the recipient.
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

/**
 * Create or retrieve a 1:1 Teams chat between sender and recipient.
 * Graph is idempotent — if the chat already exists it returns the existing one.
 * Returns the chatId (e.g. "19:xxx@thread.v2").
 */
async function getOrCreateOneOnOneChat(
  token: string,
  senderEmail: string,
  recipientEmail: string
): Promise<string> {
  const requestBody = {
    chatType: 'oneOnOne',
    members: [
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${senderEmail}')`,
      },
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${recipientEmail}')`,
      },
    ],
  }

  console.log('[TeamsDM] POST /v1.0/chats — request body:', JSON.stringify(requestBody, null, 2))

  const res = await fetch('https://graph.microsoft.com/v1.0/chats', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  // Always read the body for diagnostics
  const rawBody = await res.text()
  console.log(`[TeamsDM] POST /v1.0/chats — HTTP ${res.status}:`, rawBody)

  if (!res.ok) {
    let code = res.status.toString()
    try {
      const parsed = JSON.parse(rawBody)
      const err = parsed?.error
      code = `HTTP ${res.status} — code: ${err?.code ?? '?'}, message: ${err?.message ?? rawBody}`

      // Surface permission errors explicitly
      if (err?.code === 'Authorization_RequestDenied' || err?.code === 'Forbidden' || res.status === 403) {
        console.error('[TeamsDM] ❌ PERMISSION ERROR — ensure these Application permissions are granted in Azure portal with admin consent:')
        console.error('[TeamsDM]   • Chat.Create        (Application)')
        console.error('[TeamsDM]   • Chat.ReadWrite.All (Application)')
      }
    } catch {
      code = `HTTP ${res.status} — ${rawBody}`
    }
    throw new Error(`[TeamsDM] Chat creation failed: ${code}`)
  }

  const data = JSON.parse(rawBody)
  const chatId: string = data.id
  console.log('[TeamsDM] Chat ID obtained:', chatId)
  return chatId
}

/**
 * Post a message to a Teams chat by chatId.
 * NOTE: chatId must NOT be URI-encoded — Graph API expects the raw ID in the path.
 */
async function postChatMessage(
  token: string,
  chatId: string,
  htmlContent: string
): Promise<void> {
  // Do NOT use encodeURIComponent here — chatIds contain ":" and "@" which Graph
  // handles in the raw form. Double-encoding breaks the request.
  const url = `https://graph.microsoft.com/v1.0/chats/${chatId}/messages`
  console.log('[TeamsDM] POST', url)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: {
        contentType: 'html',
        content: htmlContent,
      },
    }),
  })

  const rawBody = await res.text()
  console.log(`[TeamsDM] POST …/messages — HTTP ${res.status}:`, rawBody.slice(0, 500))

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const parsed = JSON.parse(rawBody)
      const err = parsed?.error
      detail = `HTTP ${res.status} — code: ${err?.code ?? '?'}, message: ${err?.message ?? rawBody}`

      if (res.status === 403) {
        console.error('[TeamsDM] ❌ PERMISSION ERROR on message send — ensure Chat.ReadWrite.All (Application) is granted with admin consent')
      }
    } catch {
      detail = `HTTP ${res.status} — ${rawBody}`
    }
    throw new Error(`[TeamsDM] Message send failed: ${detail}`)
  }
}

export async function sendTeamsDm(params: TeamsDmParams): Promise<void> {
  const senderEmail = process.env.GRAPH_SENDER_EMAIL
  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  // Log config state (never log the secret itself)
  console.log('[TeamsDM] Config check:', {
    GRAPH_SENDER_EMAIL: senderEmail ?? '(MISSING)',
    AZURE_TENANT_ID: tenantId ? '✓ set' : '(MISSING)',
    AZURE_CLIENT_ID: clientId ? '✓ set' : '(MISSING)',
    AZURE_CLIENT_SECRET: clientSecret ? '✓ set' : '(MISSING)',
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
  })

  if (!senderEmail) throw new Error('[TeamsDM] GRAPH_SENDER_EMAIL not configured')
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('[TeamsDM] Missing Azure credentials (AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET)')
  }

  console.log(`[TeamsDM] Starting — from: ${senderEmail} → to: ${params.recipientEmail}`)

  const token = await getGraphToken()
  console.log('[TeamsDM] Graph token acquired ✓')

  const chatId = await getOrCreateOneOnOneChat(token, senderEmail, params.recipientEmail)

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
