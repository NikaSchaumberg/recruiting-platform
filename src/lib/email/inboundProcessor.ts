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

  console.log('[inbound] Processing email —', {
    from: normalizedFrom,
    subject: params.subject,
    graphMessageId: params.graphMessageId ?? '(none)',
    receivedAt: params.receivedAt ?? '(none)',
    bodyLength: params.body?.length ?? 0,
  })

  // Deduplication — skip if we've already stored this Graph message
  if (params.graphMessageId) {
    const { data: existing, error: dedupError } = await admin
      .from('candidate_emails')
      .select('id, application_id')
      .eq('graph_message_id', params.graphMessageId)
      .maybeSingle()

    if (dedupError) {
      console.error('[inbound] Dedup query error:', dedupError.message, dedupError.code)
      // If this is a "column does not exist" error, migration 005 hasn't been applied
      if (dedupError.message.includes('graph_message_id') || dedupError.message.includes('direction')) {
        console.error('[inbound] ⚠ Migration 005 (inbound email columns) has NOT been applied to the database.')
      }
    }

    if (existing) {
      console.log(`[inbound] Duplicate — already stored as emailId=${existing.id} for applicationId=${existing.application_id}`)
      return { applicationId: existing.application_id, emailId: existing.id, matched: true }
    }
  }

  // Match to application by sender email (most recent application wins)
  const { data: application, error: matchError } = await admin
    .from('applications')
    .select('id, applicant_email')
    .ilike('applicant_email', normalizedFrom)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (matchError) {
    console.error('[inbound] Application match query error:', matchError.message, matchError.code)
  }

  if (!application) {
    console.log(`[inbound] ✗ No application matched for sender "${normalizedFrom}" — email not stored.`)

    // Log all known applicant emails to help diagnose mismatches
    const { data: recent } = await admin
      .from('applications')
      .select('applicant_email, id')
      .order('submitted_at', { ascending: false })
      .limit(10)
    console.log('[inbound] Recent applicant emails for comparison:', recent?.map((a) => a.applicant_email) ?? [])

    return { applicationId: null, emailId: null, matched: false }
  }

  console.log(`[inbound] ✓ Matched to application ${application.id} (applicant_email="${application.applicant_email}")`)

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
      console.log(`[inbound] Unique constraint hit for graphMessageId=${params.graphMessageId} — already stored`)
      return { applicationId: application.id, emailId: null, matched: true }
    }
    // Column missing = migration not applied
    if (error.message.includes('column') || error.code === '42703') {
      console.error('[inbound] ⚠ DB insert failed — column missing. Migration 005 may not be applied.', error.message)
    } else {
      console.error('[inbound] DB insert error:', error.message, 'code:', error.code)
    }
    throw new Error(error.message)
  }

  console.log(`[inbound] ✓ Stored inbound email id=${saved?.id} for application ${application.id}`)
  return { applicationId: application.id, emailId: saved?.id ?? null, matched: true }
}
