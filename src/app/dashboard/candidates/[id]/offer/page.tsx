import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { OfferForm } from '@/components/dashboard/OfferForm'

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const admin = createAdminClient()

  const { data: application } = await admin
    .from('applications')
    .select('*, job:jobs(title, department, location, hiring_manager_id)')
    .eq('id', id)
    .single()

  if (!application) notFound()

  if (
    profile.role === 'hiring_manager' &&
    application.job?.hiring_manager_id !== user.id
  ) {
    redirect('/dashboard/jobs')
  }

  // Fetch existing offer if any
  const { data: existingOffer } = await admin
    .from('offers')
    .select('*')
    .eq('application_id', id)
    .maybeSingle()

  const job = application.job as { title: string; department: string; location: string } | null

  // Pre-fill from application/job data if no existing offer
  const initialOffer = existingOffer ?? {
    candidate_name:    application.applicant_name,
    job_title:         job?.title         ?? '',
    department:        job?.department    ?? '',
    location:          job?.location      ?? '',
    hr_name:           profile.full_name,
    start_date:        '',
    salary:            '',
    employment_type:   'full_time',
    reporting_manager: '',
    benefits:          '',
    notes:             '',
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
        <Link href="/dashboard/jobs" className="hover:text-stone-600 font-medium transition-colors">
          Jobs
        </Link>
        <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/dashboard/jobs/${application.job_id}`} className="hover:text-stone-600 font-medium transition-colors">
          {job?.title}
        </Link>
        <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/dashboard/candidates/${id}`} className="hover:text-stone-600 font-medium transition-colors">
          {application.applicant_name}
        </Link>
        <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-stone-600 font-medium">Offer Letter</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-serif-display" style={{ fontSize: '1.6rem', color: '#1A1A1A' }}>
            Offer Letter
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {application.applicant_name} · {job?.title}
          </p>
        </div>
        {existingOffer?.status === 'sent' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-green-700 bg-green-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Offer Sent
          </span>
        )}
      </div>

      <OfferForm
        applicationId={id}
        initialOffer={initialOffer}
        candidateEmail={application.applicant_email}
      />
    </div>
  )
}
