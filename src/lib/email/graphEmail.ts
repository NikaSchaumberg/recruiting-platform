let tokenCache: { token: string; expiresAt: number } | null = null

export async function getGraphToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token

  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    console.error('[Graph] Missing credentials — check AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env.local')
    throw new Error('Microsoft Graph credentials not configured')
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }).toString(),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Graph] Token request failed: HTTP ${res.status}`, text)
    throw new Error(`Graph token request failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  if (!data.access_token) {
    console.error('[Graph] Token response missing access_token:', JSON.stringify(data))
    throw new Error('Graph token response missing access_token')
  }

  console.log('[Graph] Token acquired successfully, expires in', data.expires_in, 's')
  tokenCache = { token: data.access_token, expiresAt: now + data.expires_in * 1000 }
  return tokenCache.token
}

/**
 * Send an email via Microsoft Graph API using GRAPH_SENDER_EMAIL as the sender.
 * Body is plain text — newlines are preserved in most clients.
 */
export async function sendGraphEmail(params: {
  to: string
  toName: string
  subject: string
  body: string
}): Promise<void> {
  const senderEmail = process.env.GRAPH_SENDER_EMAIL
  if (!senderEmail) {
    console.error('[Graph] GRAPH_SENDER_EMAIL is not set in .env.local')
    throw new Error('GRAPH_SENDER_EMAIL not configured')
  }

  console.log(`[Graph] Sending email — from: ${senderEmail}, to: ${params.to}, subject: "${params.subject}"`)

  const token = await getGraphToken()

  const payload = {
    message: {
      subject: params.subject,
      body: { contentType: 'Text', content: params.body },
      toRecipients: [
        { emailAddress: { address: params.to, name: params.toName } },
      ],
    },
    saveToSentItems: true,
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      const inner = errBody?.error
      errorDetail = `HTTP ${res.status} — code: ${inner?.code ?? '?'}, message: ${inner?.message ?? JSON.stringify(errBody)}`
    } catch {
      errorDetail = `HTTP ${res.status} — ${await res.text().catch(() => '(no body)')}`
    }
    console.error(`[Graph] sendMail FAILED: ${errorDetail}`)
    throw new Error(`sendMail failed: ${errorDetail}`)
  }

  console.log(`[Graph] Email sent successfully to ${params.to}`)
}

export interface GraphMessage {
  id: string
  subject: string | null
  receivedDateTime: string
  from: { emailAddress: { name: string; address: string } }
  body: { contentType: 'Text' | 'HTML'; content: string }
}

/**
 * Fetch a single message from the hr mailbox by its Graph message ID.
 * Requests the body as plain text via the Prefer header.
 */
export async function fetchGraphMessage(messageId: string): Promise<GraphMessage | null> {
  const mailbox = process.env.GRAPH_SENDER_EMAIL
  if (!mailbox) throw new Error('GRAPH_SENDER_EMAIL not configured')

  const token = await getGraphToken()
  const select = 'id,subject,receivedDateTime,from,body'
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages/${encodeURIComponent(messageId)}?$select=${select}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        // Ask Graph to return body as plain text — avoids HTML stripping
        Prefer: 'outlook.body-content-type="text"',
      },
    }
  )

  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    console.error(`[Graph] fetchGraphMessage failed: HTTP ${res.status}`, text)
    throw new Error(`fetchGraphMessage failed: ${res.status}`)
  }

  return res.json()
}
