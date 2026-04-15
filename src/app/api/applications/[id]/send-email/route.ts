export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmail } from '@/lib/email/graphEmail'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const subject = (body.subject ?? '').trim()
  const emailBody = (body.body ?? '').trim()
  const scheduledAt: string | null = body.scheduledAt ?? null  // ISO string or null

  if (!subject || !emailBody) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  // Get application
  const { data: application } = await admin
    .from('applications')
    .select('id, applicant_name, applicant_email, job_id')
    .eq('id', id)
    .single()

  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  // If scheduling for later — just save to DB, don't send now
  if (scheduledAt) {
    const { data: saved, error: dbError } = await admin
      .from('candidate_emails')
      .insert({
        application_id: id,
        subject,
        body: emailBody,
        sent_by: user.id,
        sent_by_name: profile.full_name,
        status: 'scheduled',
        direction: 'outbound',
        send_at: scheduledAt,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[send-email] DB insert error (scheduled):', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: saved?.id ?? null, scheduled: true })
  }

  // Send immediately via Graph
  try {
    await sendGraphEmail({
      to: application.applicant_email,
      toName: application.applicant_name,
      subject,
      body: emailBody,
    })
  } catch (err) {
    console.error('[send-email] Graph send failed:', err)
    return NextResponse.json(
      { error: `Failed to send email: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

  // Save to DB
  const { data: saved, error: dbError } = await admin
    .from('candidate_emails')
    .insert({
      application_id: id,
      subject,
      body: emailBody,
      sent_by: user.id,
      sent_by_name: profile.full_name,
      status: 'sent',
      direction: 'outbound',
    })
    .select('id')
    .single()

  if (dbError) {
    console.error('[send-email] DB insert error:', dbError)
    // Email was sent — don't fail the whole request
  }

  return NextResponse.json({ success: true, emailId: saved?.id ?? null, scheduled: false })
}
