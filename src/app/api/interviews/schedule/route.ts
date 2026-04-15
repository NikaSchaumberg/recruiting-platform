import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createInterviewCalendarEvent } from '@/lib/email/graphCalendar'
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
    applicationId,
    interviewerEmails,
    start,
    end,
    durationMinutes,
    interviewType,
    emailSubject,
    emailBody,
    location,
    createTeamsMeeting,
  } = body as {
    applicationId: string
    interviewerEmails: string[]
    start: string
    end: string
    durationMinutes: number
    interviewType: string
    emailSubject: string
    emailBody: string
    location?: string
    createTeamsMeeting?: boolean
  }

  if (!applicationId || !start || !end || !emailSubject || !emailBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Fetch application + candidate details
  const { data: application } = await adminClient
    .from('applications')
    .select('applicant_name, applicant_email, job:jobs(title)')
    .eq('id', applicationId)
    .single()

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  const candidateName = application.applicant_name
  const candidateEmail = application.applicant_email
  const jobTitle = (application.job as { title?: string } | null)?.title ?? ''

  let teamsJoinUrl: string | null = null
  let calendarEventId: string | null = null

  // 1. Create calendar event for all interviewers
  try {
    const allAttendees = [...interviewerEmails]
    const created = await createInterviewCalendarEvent({
      subject: emailSubject,
      body: emailBody,
      start,
      end,
      attendeeEmails: allAttendees,
      location: location || undefined,
      createTeamsMeeting: createTeamsMeeting === true,
    })
    calendarEventId = created.id
    teamsJoinUrl = created.onlineMeeting?.joinUrl ?? null
    console.log('[schedule] Calendar event created:', calendarEventId, teamsJoinUrl ? '(Teams link generated)' : '')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create calendar event'
    console.error('[schedule] Calendar event error:', message)
    return NextResponse.json({ error: `Calendar error: ${message}` }, { status: 500 })
  }

  // 2. Build final email body — inject Teams link if generated
  let finalEmailBody = emailBody
  if (teamsJoinUrl) {
    finalEmailBody += `\n\nJoin Teams Meeting:\n${teamsJoinUrl}`
  } else if (location) {
    finalEmailBody += `\n\nLocation: ${location}`
  }

  // 3. Send email to candidate
  try {
    await sendGraphEmail({
      to: candidateEmail,
      toName: candidateName,
      subject: emailSubject,
      body: finalEmailBody,
      from: cleanEnv(process.env.GRAPH_SENDER_EMAIL),
    })
    console.log('[schedule] Candidate email sent to', candidateEmail)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    console.error('[schedule] Email error:', message)
    return NextResponse.json({ error: `Email error: ${message}` }, { status: 500 })
  }

  // 4. Log email to candidate_emails
  await adminClient.from('candidate_emails').insert({
    application_id: applicationId,
    subject: emailSubject,
    body: finalEmailBody,
    sent_by: user.id,
    sent_by_name: profile.full_name,
    status: 'sent',
    direction: 'outbound',
  })

  // 5. Save interview to interviews table
  const { data: interview, error: insertError } = await adminClient
    .from('interviews')
    .insert({
      application_id: applicationId,
      scheduled_at: start,
      duration_minutes: durationMinutes,
      interview_type: interviewType,
      location: teamsJoinUrl ?? location ?? null,
      notes: null,
      status: 'scheduled',
      created_by: user.id,
      interviewer_emails: interviewerEmails ?? [],
      graph_event_id: calendarEventId,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[schedule] DB insert error:', insertError)
    // Don't fail — email + calendar event already sent
  }

  return NextResponse.json({
    interview,
    teamsJoinUrl,
    calendarEventId,
  })
}
