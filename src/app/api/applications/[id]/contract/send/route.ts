export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmailWithAttachment } from '@/lib/email/graphEmail'
import { generateContractPdf } from '@/lib/pdf/contractPdf'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'hiring_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const contract = body.contract
  if (!contract) return NextResponse.json({ error: 'contract data required' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch application email
  const { data: application } = await admin
    .from('applications')
    .select('applicant_email, applicant_name')
    .eq('id', id)
    .single()
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  // Generate PDF
  const pdfBytes = await generateContractPdf(contract)
  const base64 = Buffer.from(pdfBytes).toString('base64')

  // Send email
  await sendGraphEmailWithAttachment({
    to: application.applicant_email,
    toName: application.applicant_name,
    subject: `Employment Contract — ${contract.job_title}`,
    body: `Dear ${contract.candidate_name},\n\nPlease find your employment contract attached. Review and sign at your earliest convenience.\n\nWarm regards,\n${contract.hr_name || 'The Exxir LLC Team'}`,
    attachment: {
      filename: `contract-${contract.candidate_name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      contentType: 'application/pdf',
      base64,
    },
  })

  // Upsert contract with status = sent
  const { data: saved, error } = await admin
    .from('contracts')
    .upsert({
      application_id: id,
      ...contract,
      status: 'sent',
      sent_at: new Date().toISOString(),
    }, { onConflict: 'application_id' })
    .select()
    .single()

  if (error) console.error('[contract/send] upsert error:', error)

  // Log to candidate_emails
  await admin.from('candidate_emails').insert({
    application_id: id,
    subject: `Employment Contract — ${contract.job_title}`,
    body: `[Contract PDF sent as attachment to ${application.applicant_email}]`,
    sent_by: user.id,
    sent_by_name: profile.full_name,
    status: 'sent',
    direction: 'outbound',
  }).then(() => {})

  return NextResponse.json({ contract: saved ?? contract })
}
