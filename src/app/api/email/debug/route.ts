export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanEnv } from '@/lib/email/graphEmail'

export async function POST(request: Request) {
  // Auth guard — admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { to = 'hr@exxircapital.com' } = await request.json().catch(() => ({}))

  const log: string[] = []

  // ── 1. Env var audit ─────────────────────────────────────────────────────
  const tenantId     = cleanEnv(process.env.AZURE_TENANT_ID)
  const clientId     = cleanEnv(process.env.AZURE_CLIENT_ID)
  const clientSecret = cleanEnv(process.env.AZURE_CLIENT_SECRET)
  const senderEmail  = cleanEnv(process.env.GRAPH_SENDER_EMAIL)

  log.push('=== ENV VARS ===')
  log.push(`AZURE_TENANT_ID:     ${tenantId     ? `SET (${tenantId.length} chars, ends: "...${tenantId.slice(-4)}")` : 'MISSING'}`)
  log.push(`AZURE_CLIENT_ID:     ${clientId     ? `SET (${clientId.length} chars, ends: "...${clientId.slice(-4)}")` : 'MISSING'}`)
  log.push(`AZURE_CLIENT_SECRET: ${clientSecret ? `SET (${clientSecret.length} chars, ends: "...${clientSecret.slice(-4)}")` : 'MISSING'}`)
  log.push(`GRAPH_SENDER_EMAIL:  ${senderEmail  ? `SET → "${senderEmail}"` : 'MISSING'}`)

  // Raw values — show if they contain unexpected characters
  const rawTenant = process.env.AZURE_TENANT_ID ?? ''
  const rawClient = process.env.AZURE_CLIENT_ID ?? ''
  const rawSender = process.env.GRAPH_SENDER_EMAIL ?? ''
  if (rawTenant !== tenantId)     log.push(`  ⚠ AZURE_TENANT_ID had whitespace/newlines that were stripped`)
  if (rawClient !== clientId)     log.push(`  ⚠ AZURE_CLIENT_ID had whitespace/newlines that were stripped`)
  if (rawSender !== senderEmail)  log.push(`  ⚠ GRAPH_SENDER_EMAIL had whitespace/newlines that were stripped`)

  if (!tenantId || !clientId || !clientSecret || !senderEmail) {
    log.push('\nFATAL: missing env vars — cannot proceed')
    return NextResponse.json({ log, success: false }, { status: 500 })
  }

  // ── 2. Token request ──────────────────────────────────────────────────────
  log.push('\n=== GRAPH TOKEN REQUEST ===')
  let token: string
  try {
    const tokenRes = await fetch(
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

    const tokenBody = await tokenRes.json()
    if (!tokenRes.ok || !tokenBody.access_token) {
      log.push(`FAILED: HTTP ${tokenRes.status}`)
      log.push(`Response: ${JSON.stringify(tokenBody, null, 2)}`)
      return NextResponse.json({ log, success: false }, { status: 500 })
    }

    token = tokenBody.access_token
    log.push(`OK — token acquired, expires_in=${tokenBody.expires_in}s`)
  } catch (err) {
    log.push(`EXCEPTION: ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ log, success: false }, { status: 500 })
  }

  // ── 3. Send test email ────────────────────────────────────────────────────
  log.push(`\n=== SEND MAIL → ${to} ===`)
  try {
    const mailRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            subject: '[DEBUG] Recruiting Platform — Email Test',
            body: {
              contentType: 'Text',
              content: `This is a test email sent from the recruiting platform debug endpoint.\n\nSender: ${senderEmail}\nRecipient: ${to}\nTimestamp: ${new Date().toISOString()}`,
            },
            toRecipients: [{ emailAddress: { address: to, name: 'Test Recipient' } }],
          },
          saveToSentItems: false,
        }),
      }
    )

    if (mailRes.ok) {
      log.push(`OK — email sent successfully (HTTP ${mailRes.status})`)
      return NextResponse.json({ log, success: true })
    }

    // Parse the full error from Graph
    let errDetail: unknown
    try { errDetail = await mailRes.json() } catch { errDetail = await mailRes.text().catch(() => '(no body)') }
    log.push(`FAILED: HTTP ${mailRes.status}`)
    log.push(`Graph error: ${JSON.stringify(errDetail, null, 2)}`)
    return NextResponse.json({ log, success: false }, { status: 500 })
  } catch (err) {
    log.push(`EXCEPTION: ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json({ log, success: false }, { status: 500 })
  }
}
