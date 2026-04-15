import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateInterviewCalendarEvent } from '@/lib/email/graphCalendar'
import { sendGraphEmail, cleanEnv } from '@/lib/email/graphEmail'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'hiring_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    interviewId,
    interviewerEmails,
    start,
    end,
    durationMinutes,
    interviewType,
    emailSubject,
    emailBody,
    location,
  } = body as {
    interviewId: string
    interviewerEmails: string[]
    start: string
    end: string
    durationMinutes: number
    interviewType: string
    emailSubject: string
    emailBody: string
    location?: string
  }

  if (!interviewId || !start || !end || !emailSubject || !emailBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // 1. Fetch the interview
  const { data: interview } = await adminClient
    .from('interviews')
    .select('id, graph_event_id, application_id')
    .eq('id', interviewId)
    .single()

  if (!interview) {
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  }

  // 2. Fetch application details
  const { data: application } = await adminClient
    .from('applications')
    .select('applicant_name, applicant_email, job:jobs(title)')
    .eq('id', interview.application_id)
    .single()

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  const candidateName = application.applicant_name
  const candidateEmail = application.applicant_email

  // 3. Update calendar event if graph_event_id exists
  if (interview.graph_event_id) {
    try {
      await updateInterviewCalendarEvent({
        eventId: interview.graph_event_id,
        subject: emailSubject,
        body: emailBody,
        start,
        end,
        attendeeEmails: interviewerEmails,
        location,
      })
      console.log('[reschedule] Calendar event updated:', interview.graph_event_id)
    } catch (err) {
      console.error('[reschedule] Calendar event update failed:', err instanceof Error ? err.message : err)
      // Don't return error — continue with email and DB update
    }
  }

  // 4. Build final email body
  let finalEmailBody = emailBody
  if (location) {
    finalEmailBody += `\n\nLocation: ${location}`
  }

  // 5. Send reschedule email to candidate
  try {
    await sendGraphEmail({
      to: candidateEmail,
      toName: candidateName,
      subject: emailSubject,
      body: finalEmailBody,
      from: cleanEnv(process.env.GRAPH_SENDER_EMAIL),
    })
    console.log('[reschedule] Candidate email sent to', candidateEmail)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    console.error('[reschedule] Email error:', message)
    return NextResponse.json({ error: `Email error: ${message}` }, { status: 500 })
  }

  // 6. Log to candidate_emails
  await adminClient.from('candidate_emails').insert({
    application_id: interview.application_id,
    subject: emailSubject,
    body: finalEmailBody,
    sent_by: user.id,
    sent_by_name: profile.full_name,
    status: 'sent',
    direction: 'outbound',
  })

  // 7. Update interviews table
  const { data: updatedInterview, error: updateError } = await adminClient
    .from('interviews')
    .update({
      scheduled_at: start,
      duration_minutes: durationMinutes,
      interview_type: interviewType,
      location: location ?? null,
      interviewer_emails: interviewerEmails,
    })
    .eq('id', interviewId)
    .select()
    .single()

  if (updateError) {
    console.error('[reschedule] DB update error:', updateError)
  }

  return NextResponse.json({ interview: updatedInterview })
}
