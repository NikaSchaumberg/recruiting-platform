import { createAdminClient } from '@/lib/supabase/admin'

export interface InboundEmailParams {
  fromEmail: string
  fromName?: string
  subject: string
  body: string
  receivedAt?: string
  graphMessageId?: string
}

export interface InboundResult {
  applicationId: string | null
  emailId: string | null
  matched: boolean
}

/**
 * Match an inbound email to an application by sender address and persist it.
 * Idempotent: duplicate graphMessageId is silently ignored.
 */
export async function processInboundEmail(
  params: InboundEmailParams
): Promise<InboundResult> {
  const admin = createAdminClient()
  const normalizedFrom = params.fromEmail.toLowerCase().trim()

  // Deduplication — skip if we've already stored this Graph message
  if (params.graphMessageId) {
    const { data: existing } = await admin
      .from('candidate_emails')
      .select('id, application_id')
      .eq('graph_message_id', params.graphMessageId)
      .maybeSingle()

    if (existing) {
      console.log(`[inbound] Duplicate message ${params.graphMessageId}, skipping`)
      return { applicationId: existing.application_id, emailId: existing.id, matched: true }
    }
  }

  // Match to application by sender email (most recent application wins)
  const { data: application } = await admin
    .from('applications')
    .select('id')
    .ilike('applicant_email', normalizedFrom)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!application) {
    console.log(`[inbound] No application matched for sender: ${normalizedFrom}`)
    return { applicationId: null, emailId: null, matched: false }
  }

  const { data: saved, error } = await admin
    .from('candidate_emails')
    .insert({
      application_id: application.id,
      subject: params.subject,
      body: params.body,
      sent_by: null,
      sent_by_name: params.fromName ?? params.fromEmail,
      status: 'received',
      direction: 'inbound',
      from_email: params.fromEmail,
      from_name: params.fromName ?? null,
      graph_message_id: params.graphMessageId ?? null,
      sent_at: params.receivedAt ?? new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    // Unique constraint violation = duplicate, treat as success
    if (error.code === '23505') {
      console.log(`[inbound] Unique constraint hit for ${params.graphMessageId}, already stored`)
      return { applicationId: application.id, emailId: null, matched: true }
    }
    console.error('[inbound] DB insert error:', error)
    throw new Error(error.message)
  }

  console.log(`[inbound] Stored inbound email ${saved?.id} for application ${application.id}`)
  return { applicationId: application.id, emailId: saved?.id ?? null, matched: true }
}
