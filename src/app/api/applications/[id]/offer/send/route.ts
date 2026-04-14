export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmailWithAttachment } from '@/lib/email/graphEmail'
import { generateOfferPdf } from '@/lib/pdf/offerPdf'
import { EMAIL_TEMPLATES, fillTemplate } from '@/lib/email/templates'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await request.json()
  const offer = body.offer

  if (!offer) return NextResponse.json({ error: 'offer data required' }, { status: 400 })

  // Fetch candidate email
  const { data: application } = await admin
    .from('applications')
    .select('applicant_name, applicant_email, job:jobs(title)')
    .eq('id', id)
    .single()

  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  try {
    // Generate PDF
    const pdfBytes = await generateOfferPdf(offer)
    const base64 = Buffer.from(pdfBytes).toString('base64')
    const filename = `offer-letter-${offer.candidate_name.replace(/\s+/g, '-').toLowerCase()}.pdf`

    // Build email body from template
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === 'offer_letter')!
    const emailBody = fillTemplate(tpl.body, {
      candidate_name: offer.candidate_name,
      job_title: offer.job_title,
      hr_name: offer.hr_name,
      start_date: offer.start_date
        ? new Date(offer.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      salary: offer.salary ? `$${Number(offer.salary).toLocaleString()}` : '',
    })

    await sendGraphEmailWithAttachment({
      to: application.applicant_email,
      toName: application.applicant_name,
      subject: fillTemplate(tpl.subject, { job_title: offer.job_title, candidate_name: offer.candidate_name, hr_name: offer.hr_name }),
      body: emailBody,
      attachment: { filename, contentType: 'application/pdf', base64 },
    })

    // Save offer record and mark as sent
    await admin
      .from('offers')
      .upsert(
        { ...offer, application_id: id, status: 'sent', sent_at: new Date().toISOString() },
        { onConflict: 'application_id' }
      )

    // Log to candidate_emails
    await admin.from('candidate_emails').insert({
      application_id: id,
      subject: `Offer Letter — ${offer.job_title}`,
      body: `[Offer letter PDF sent as attachment]`,
      sent_by: user.id,
      sent_by_name: offer.hr_name,
      status: 'sent',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[offer/send] Failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send offer' },
      { status: 500 }
    )
  }
}
