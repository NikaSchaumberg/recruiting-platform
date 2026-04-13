export const runtime = 'nodejs'

import { NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromPDF } from '@/lib/pdf/extractor'
import { screenCandidate } from '@/lib/claude/screener'
import { sendTeamsNotification } from '@/lib/notifications/teams'
import { sendOutlookNotification } from '@/lib/notifications/outlook'
import { sendTeamsDm } from '@/lib/notifications/teamsDm'
import { randomUUID } from 'crypto'

const MAX_CV_SIZE = 8 * 1024 * 1024 // 8MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const jobId = formData.get('job_id') as string
    const applicantName = formData.get('applicant_name') as string
    const applicantEmail = formData.get('applicant_email') as string
    const phone = formData.get('phone') as string | null
    const linkedinUrl = formData.get('linkedin_url') as string | null
    const coverLetter = formData.get('cover_letter') as string | null
    const cvFile = formData.get('cv') as File | null
    const applicationDataStr = formData.get('application_data') as string | null
    const coverLetterFile = formData.get('cover_letter_file') as File | null

    // Validate required fields
    if (!jobId || !applicantName || !applicantEmail || !cvFile) {
      return NextResponse.json(
        { error: 'Missing required fields: job_id, applicant_name, applicant_email, cv' },
        { status: 400 }
      )
    }

    if (!applicantEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (cvFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'CV must be a PDF file' }, { status: 400 })
    }

    if (cvFile.size > MAX_CV_SIZE) {
      return NextResponse.json({ error: 'CV file must be smaller than 8MB' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify job exists and is open
    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .select('*, hiring_manager:profiles!jobs_hiring_manager_id_fkey(id, full_name, email, role, created_at)')
      .eq('id', jobId)
      .eq('status', 'open')
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or no longer accepting applications' }, { status: 404 })
    }

    // Read CV buffer
    const cvBuffer = Buffer.from(await cvFile.arrayBuffer())
    const applicationId = randomUUID()
    const safeFilename = cvFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const cvPath = `${jobId}/${applicationId}/${safeFilename}`

    // Upload CV to Supabase Storage
    const { error: uploadError } = await adminClient.storage
      .from('cvs')
      .upload(cvPath, cvBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Storage] Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload CV' }, { status: 500 })
    }

    // Upload cover letter file if provided
    let coverLetterPath: string | null = null
    if (coverLetterFile && coverLetterFile.type === 'application/pdf') {
      const clBuffer = Buffer.from(await coverLetterFile.arrayBuffer())
      const clFilename = coverLetterFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const clPath = `${jobId}/${applicationId}/cover_letter_${clFilename}`
      const { error: clError } = await adminClient.storage
        .from('cvs')
        .upload(clPath, clBuffer, { contentType: 'application/pdf', upsert: false })
      if (!clError) coverLetterPath = clPath
    }

    // Parse application_data if provided
    let applicationData: Record<string, unknown> | null = null
    if (applicationDataStr) {
      try {
        applicationData = JSON.parse(applicationDataStr)
        if (coverLetterPath) (applicationData as Record<string, unknown>).coverLetterPath = coverLetterPath
      } catch { /* ignore malformed JSON */ }
    }

    // Insert application record
    const { data: application, error: appError } = await adminClient
      .from('applications')
      .insert({
        id: applicationId,
        job_id: jobId,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        cover_letter: coverLetter || null,
        cv_path: cvPath,
        cv_filename: cvFile.name,
        status: 'screening',
        ...(applicationData ? { application_data: applicationData } : {}),
      })
      .select()
      .single()

    if (appError || !application) {
      console.error('[DB] Application insert error:', JSON.stringify(appError, null, 2))
      const detail = appError?.message ?? appError?.code ?? 'unknown error'
      return NextResponse.json({ error: `Failed to save application: ${detail}` }, { status: 500 })
    }

    // Run AI screening after the response is sent.
    // `after()` keeps the Vercel function alive until the work completes,
    // so the pipeline and email notifications are never killed mid-flight.
    console.log('[Applications] Application created, scheduling screening pipeline for', applicationId)
    after(
      runScreeningPipeline({
        applicationId,
        applicantName,
        applicantEmail,
        cvBuffer,
        job,
        coverLetter,
      }).catch((err) => console.error('[Screening] Pipeline error:', err))
    )

    return NextResponse.json(
      { success: true, applicationId },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Applications] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function runScreeningPipeline(params: {
  applicationId: string
  applicantName: string
  applicantEmail: string
  cvBuffer: Buffer
  job: {
    id: string
    title: string
    department: string
    description: string
    requirements: string
    screening_criteria: string
    hiring_manager: { id: string; full_name: string; email: string } | null
  }
  coverLetter: string | null
}) {
  const { applicationId, applicantName, applicantEmail, cvBuffer, job } = params
  const adminClient = createAdminClient()

  try {
    // Extract text from PDF
    let cvText: string
    try {
      cvText = await extractTextFromPDF(cvBuffer)
    } catch (err) {
      console.error('[PDF] Extraction failed:', err)
      cvText = '[CV text could not be extracted — manual review required]'
    }

    if (params.coverLetter) {
      cvText = `COVER LETTER:\n${params.coverLetter}\n\n---\n\nCV / RESUME:\n${cvText}`
    }

    // AI screening
    const screening = await screenCandidate({
      jobTitle: job.title,
      jobDescription: job.description,
      requirements: job.requirements,
      screeningCriteria: job.screening_criteria,
      cvText,
      applicantName,
    })

    // Save screening result
    await adminClient.from('ai_screenings').insert({
      application_id: applicationId,
      score: screening.score,
      summary: screening.summary,
      strengths: screening.strengths,
      gaps: screening.gaps,
      recommendation: screening.recommendation,
      raw_response: screening.raw_response,
    })

    // Update application status
    await adminClient
      .from('applications')
      .update({ status: 'screened' })
      .eq('id', applicationId)

    // Build dashboard URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const dashboardUrl = `${baseUrl}/dashboard/candidates/${applicationId}`

    // HR_INBOX_EMAIL = where HR notification emails are sent (e.g. hr@exxircapital.com)
    // GRAPH_SENDER_EMAIL = the M365 user account that sends all emails (e.g. nschaumberg@exxircapital.com)
    const hrEmail = process.env.HR_INBOX_EMAIL
    const hmEmail = job.hiring_manager?.email
    const hmName = job.hiring_manager?.full_name ?? 'Hiring Manager'

    console.log('[Screening] Sending notifications —', {
      hrInbox: hrEmail ?? '(HR_INBOX_EMAIL not set)',
      graphSender: process.env.GRAPH_SENDER_EMAIL ?? '(GRAPH_SENDER_EMAIL not set)',
      hiringManager: hmEmail ?? '(no hiring manager)',
      applicantName,
      jobTitle: job.title,
      score: screening.score,
      recommendation: screening.recommendation,
    })

    const notificationParams = {
      applicantName,
      applicantEmail,
      jobTitle: job.title,
      jobDepartment: job.department,
      score: screening.score,
      recommendation: screening.recommendation,
      summary: screening.summary,
      strengths: screening.strengths,
      gaps: screening.gaps,
      dashboardUrl,
    }

    // ─── Notifications ────────────────────────────────────────────────────────
    // All 4 fire in parallel. Failures are logged individually but never block
    // each other — Promise.allSettled ensures every task runs to completion.

    const notifications: { label: string; task: Promise<void> }[] = []

    // 1. HR channel (Teams webhook)
    notifications.push({
      label: 'HR Teams channel webhook',
      task: sendTeamsNotification(notificationParams),
    })

    // 2. HR inbox email
    if (hrEmail) {
      notifications.push({
        label: `HR inbox email → ${hrEmail}`,
        task: sendOutlookNotification({
          ...notificationParams,
          recipientEmail: hrEmail,
          recipientName: 'HR Team',
        }),
      })
    } else {
      console.warn('[Screening] HR_INBOX_EMAIL not set — skipping HR inbox email')
    }

    // 3 & 4. Hiring manager notifications (only if assigned)
    if (hmEmail) {
      // 3. Private Teams DM to hiring manager.
      // Wrapped so that ACL/permission failures are logged but never affect
      // the other notification tasks (hiring manager email already fires independently).
      notifications.push({
        label: `Hiring manager Teams DM → ${hmEmail}`,
        task: sendTeamsDm({
          recipientEmail: hmEmail,
          recipientName: hmName,
          applicantName,
          applicantEmail,
          jobTitle: job.title,
          score: screening.score,
          recommendation: screening.recommendation,
          strengths: screening.strengths,
          dashboardUrl,
        }).catch((dmErr: unknown) => {
          const msg = dmErr instanceof Error ? dmErr.message : String(dmErr)
          console.warn(
            '[Screening] Teams DM failed (hiring manager email was sent separately):',
            msg,
          )
          // Swallow — email (task 4) delivers regardless
        }),
      })

      // 4. Hiring manager email (always, independent of Teams DM)
      notifications.push({
        label: `Hiring manager email → ${hmEmail}`,
        task: sendOutlookNotification({
          ...notificationParams,
          recipientEmail: hmEmail,
          recipientName: hmName,
        }),
      })
    } else {
      console.log('[Screening] No hiring manager assigned — skipping steps 3 & 4')
    }

    console.log(`[Screening] Firing ${notifications.length} notification(s) in parallel`)
    const results = await Promise.allSettled(notifications.map((n) => n.task))
    results.forEach((r, i) => {
      const label = notifications[i].label
      if (r.status === 'fulfilled') {
        console.log(`[Screening] ✓ ${label}`)
      } else {
        console.error(`[Screening] ✗ ${label}:`, r.reason instanceof Error ? r.reason.message : r.reason)
      }
    })
  } catch (err) {
    console.error('[Screening] Pipeline failed for application', applicationId, err)
    // Mark as pending so it doesn't stay in screening limbo
    try {
      await adminClient
        .from('applications')
        .update({ status: 'pending' })
        .eq('id', applicationId)
    } catch {
      // ignore
    }
  }
}
