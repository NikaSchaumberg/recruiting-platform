/**
 * Send a private Teams chat message to an individual user via Microsoft Graph API.
 *
 * Required Azure app permissions (grant in Azure portal > App registrations > API permissions):
 *   - Chat.Create              (Application)
 *   - Chat.ReadWrite.All       (Application)
 *
 * The message is sent from GRAPH_SENDER_EMAIL (the service account / hr inbox).
 * If the chat already exists between the two users, Graph returns it — no duplicates created.
 */

import { getGraphToken } from '@/lib/email/graphEmail'

interface TeamsDmParams {
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
 * Create or retrieve a 1:1 Teams chat between the sender (GRAPH_SENDER_EMAIL) and the recipient.
 * Returns the chatId.
 */
async function getOrCreateOneOnOneChat(
  token: string,
  senderEmail: string,
  recipientEmail: string
): Promise<string> {
  const body = {
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

  const res = await fetch('https://graph.microsoft.com/v1.0/chats', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[TeamsDM] Chat create failed: HTTP ${res.status} — ${text}`)
  }

  const data = await res.json()
  return data.id as string
}

/**
 * Post a message to a Teams chat by chatId.
 */
async function postChatMessage(
  token: string,
  chatId: string,
  htmlContent: string
): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(chatId)}/messages`, {
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

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[TeamsDM] Message send failed: HTTP ${res.status} — ${text}`)
  }
}

export async function sendTeamsDm(params: TeamsDmParams): Promise<void> {
  const senderEmail = process.env.GRAPH_SENDER_EMAIL
  if (!senderEmail) {
    throw new Error('[TeamsDM] GRAPH_SENDER_EMAIL not configured')
  }

  const requiredEnv = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET']
  const missing = requiredEnv.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`[TeamsDM] Missing Azure credentials: ${missing.join(', ')}`)
  }

  console.log(`[TeamsDM] Sending DM to ${params.recipientEmail} for candidate ${params.applicantName}`)

  const token = await getGraphToken()

  // Get or create the 1:1 chat
  const chatId = await getOrCreateOneOnOneChat(token, senderEmail, params.recipientEmail)
  console.log(`[TeamsDM] Chat ID: ${chatId}`)

  // Top 3 strengths
  const top3 = params.strengths.slice(0, 3)

  const html = `
<p><strong>🤖 New candidate screened for <em>${params.jobTitle}</em></strong></p>
<table>
  <tr><td><strong>Candidate</strong></td><td>${params.applicantName} (${params.applicantEmail})</td></tr>
  <tr><td><strong>AI Score</strong></td><td>${scoreEmoji(params.score)} ${params.score}/100</td></tr>
  <tr><td><strong>Recommendation</strong></td><td>${formatRecommendation(params.recommendation)}</td></tr>
</table>
${top3.length > 0 ? `<p><strong>Top skills / strengths:</strong><br>${top3.map((s) => `• ${s}`).join('<br>')}</p>` : ''}
<p><a href="${params.dashboardUrl}">👉 View full profile in dashboard</a></p>
`.trim()

  await postChatMessage(token, chatId, html)
  console.log(`[TeamsDM] Message delivered to ${params.recipientEmail}`)
}
