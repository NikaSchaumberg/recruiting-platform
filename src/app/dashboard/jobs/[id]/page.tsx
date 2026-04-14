import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExportButton } from '@/components/dashboard/ExportButton'
import { CandidatesPipelineView } from '@/components/dashboard/CandidatesPipelineView'
import { formatDate, formatEmploymentType } from '@/lib/utils/formatting'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const { data: job } = await supabase
    .from('jobs')
    .select('*, hiring_manager:profiles!jobs_hiring_manager_id_fkey(id, full_name, email, role, created_at)')
    .eq('id', id)
    .single()

  if (!job) notFound()

  if (
    profile.role === 'hiring_manager' &&
    job.hiring_manager_id !== user.id
  ) {
    redirect('/dashboard/jobs')
  }

  const { data: applications } = await supabase
    .from('applications')
    .select('*, ai_screening:ai_screenings(*)')
    .eq('job_id', id)
    .order('submitted_at', { ascending: false })


  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/dashboard/jobs" className="text-xs text-stone-400 hover:text-stone-600 font-medium transition-colors">
              Jobs
            </Link>
            <svg className="w-3 h-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-xs text-stone-600 font-medium">{job.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <Badge
              className={
                job.status === 'open'
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-stone-500 bg-stone-100 border border-stone-200'
              }
            >
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Badge>
            {job.department && (
              <span className="text-sm text-gray-400">{job.department}</span>
            )}
            {job.location && (
              <span className="text-sm text-gray-400">· {job.location}</span>
            )}
            <span className="text-sm text-gray-400">
              · {formatEmploymentType(job.employment_type)}
            </span>
            <span className="text-sm text-gray-300">· Posted {formatDate(job.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            jobTitle={job.title}
            applications={(applications ?? []).map((app) => ({
              applicant_name: app.applicant_name,
              applicant_email: app.applicant_email,
              phone: app.phone ?? null,
              status: app.status,
              submitted_at: app.submitted_at,
              ai_screening: app.ai_screening
                ? { score: app.ai_screening.score, recommendation: app.ai_screening.recommendation }
                : null,
            }))}
          />
          {profile.role === 'admin' && (
            <Link href={`/dashboard/jobs/${id}/edit`}>
              <Button variant="secondary" size="sm">Edit Job</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Applications */}
      <CandidatesPipelineView
        applications={(applications ?? []).map((app) => ({
          id: app.id,
          applicant_name: app.applicant_name,
          applicant_email: app.applicant_email,
          status: app.status,
          submitted_at: app.submitted_at,
          ai_screening: app.ai_screening
            ? { score: app.ai_screening.score, recommendation: app.ai_screening.recommendation }
            : null,
        }))}
        jobId={id}
        jobStatus={job.status}
      />
    </div>
  )
}
