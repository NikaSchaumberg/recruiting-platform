export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmail } from '@/lib/email/graphEmail'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: messages, error } = await admin
    .from('candidate_messages')
    .select('*')
    .eq('application_id', id)
    .order('sent_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: messages ?? [] })
}

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
    .select('id, full_name, role, email')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const text = (body.text ?? '').trim()
  if (!text) return NextResponse.json({ error: 'Message text required' }, { status: 400 })

  // Get application + job info for notifications
  const { data: application } = await admin
    .from('applications')
    .select('id, applicant_name, job_id')
    .eq('id', id)
    .single()

  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  // Fetch job + participants for notification (separate query to avoid join type issues)
  const { data: job } = await admin
    .from('jobs')
    .select('title, hiring_manager:profiles!jobs_hiring_manager_id_fkey(full_name, email), creator:profiles!jobs_created_by_fkey(full_name, email)')
    .eq('id', application.job_id)
    .single()

  // Save message
  const { data: message, error: msgError } = await admin
    .from('candidate_messages')
    .insert({
      application_id: id,
      sender_id: user.id,
      sender_name: profile.full_name,
      text,
    })
    .select()
    .single()

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Fire-and-forget notification
  if (job) {
    sendNotification({ applicantName: application.applicant_name, job, profile, text }).catch((err) =>
      console.error('[messages] Notification error:', err)
    )
  }

  return NextResponse.json({ success: true, message })
}

async function sendNotification(params: {
  applicantName: string
  job: { title: string; hiring_manager: unknown; creator: unknown }
  profile: { full_name: string; role: string; email: string }
  text: string
}) {
  const { applicantName, job, profile, text } = params
  const isAdmin = profile.role === 'admin'

  type Participant = { full_name: string; email: string }
  const hm = job.hiring_manager as Participant | null
  const creator = job.creator as Participant | null

  const recipient = isAdmin ? hm : creator
  if (!recipient?.email || recipient.email === profile.email) return

  await sendGraphEmail({
    to: recipient.email,
    toName: recipient.full_name,
    subject: `New message about ${applicantName} – ${job.title}`,
    body: `${profile.full_name} left a note on ${applicantName}'s application for ${job.title}:\n\n"${text}"\n\nView in dashboard: ${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/dashboard`,
  })
}
