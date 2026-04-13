import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ContractForm } from '@/components/dashboard/ContractForm'

export default async function ContractPage({
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
  if (profile.role !== 'admin' && profile.role !== 'hiring_manager') redirect('/dashboard/jobs')

  const admin = createAdminClient()

  const { data: application } = await admin
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('id', id)
    .single()
  if (!application) notFound()

  if (profile.role === 'hiring_manager' && application.job?.hiring_manager_id !== user.id) {
    redirect('/dashboard/jobs')
  }

  // Fetch existing contract
  const { data: existingContract } = await admin
    .from('contracts')
    .select('*')
    .eq('application_id', id)
    .maybeSingle()

  // Fetch offer to pre-fill
  const { data: offer } = await admin
    .from('offers')
    .select('*')
    .eq('application_id', id)
    .maybeSingle()

  const initialData = {
    offer_id:          offer?.id ?? null,
    candidate_name:    application.applicant_name,
    job_title:         offer?.job_title ?? application.job?.title ?? '',
    department:        offer?.department ?? application.job?.department ?? '',
    location:          offer?.location ?? application.job?.location ?? '',
    start_date:        offer?.start_date ?? null,
    salary:            offer?.salary ?? null,
    employment_type:   offer?.employment_type ?? application.job?.employment_type ?? '',
    reporting_manager: offer?.reporting_manager ?? '',
    benefits:          offer?.benefits ?? '',
    additional_terms:  '',
    hr_name:           offer?.hr_name ?? profile.full_name ?? '',
  }

  const contractSent = existingContract?.status === 'sent'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3 text-xs text-stone-400">
            <Link href="/dashboard/jobs" className="hover:text-stone-600 font-medium transition-colors">Jobs</Link>
            <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href={`/dashboard/jobs/${application.job_id}`} className="hover:text-stone-600 font-medium transition-colors">
              {application.job?.title}
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
            <span className="text-stone-600 font-medium">Contract</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Employment Contract</h1>
          <p className="text-sm text-gray-400 mt-1">{application.applicant_name} · {application.job?.title}</p>
        </div>
        {contractSent && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Contract Sent
          </span>
        )}
      </div>

      <ContractForm
        applicationId={id}
        initialData={initialData}
        existingContract={existingContract}
      />
    </div>
  )
}
