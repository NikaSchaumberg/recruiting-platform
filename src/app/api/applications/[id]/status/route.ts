export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmail } from '@/lib/email/graphEmail'
import type { ApplicationStatus } from '@/types/database'

const VALID_STATUSES: ApplicationStatus[] = [
  'pending', 'screening', 'screened', 'shortlisted',
  'interview_invited', 'interview',
  'first_interview', 'second_interview',
  'offer', 'rejected', 'hired',
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'New',
  screening: 'Screening',
  screened: 'Screened',
  shortlisted: 'Shortlisted',
  interview_invited: 'Interview Invited',
  interview: 'Interview',
  first_interview: '1st Interview',
  second_interview: '2nd Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const body = await request.json()
  const status = body.status as ApplicationStatus

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget: notify hiring manager of status change
  notifyHiringManager({ id, status, senderName: senderProfile?.full_name ?? 'HR', admin }).catch(
    (err) => console.error('[status] HM notification error:', err)
  )

  return NextResponse.json({ success: true })
}

async function notifyHiringManager(params: {
  id: string
  status: string
  senderName: string
  admin: ReturnType<typeof createAdminClient>
}) {
  const { id, status, senderName, admin } = params

  const { data: application } = await admin
    .from('applications')
    .select('applicant_name, job:jobs(title, hiring_manager:profiles!jobs_hiring_manager_id_fkey(full_name, email))')
    .eq('id', id)
    .single()

  const hm = (application?.job as { hiring_manager?: { full_name: string; email: string } | null } | null)?.hiring_manager
  if (!hm?.email) return

  const jobTitle = (application?.job as { title?: string } | null)?.title ?? 'Unknown position'
  const candidateName = application?.applicant_name ?? 'Candidate'
  const statusLabel = STATUS_LABELS[status] ?? status
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/dashboard/candidates/${id}`

  await sendGraphEmail({
    to: hm.email,
    toName: hm.full_name,
    subject: `Application Update: ${candidateName} → ${statusLabel}`,
    body: `Hi ${hm.full_name},\n\n${senderName} has updated the status of ${candidateName}'s application for "${jobTitle}" to: ${statusLabel}\n\nView candidate profile:\n${dashboardUrl}\n\nExxir Capital Recruiting`,
  })
}
