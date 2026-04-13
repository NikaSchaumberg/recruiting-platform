import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExportButton } from '@/components/dashboard/ExportButton'
import { ClickableRow } from '@/components/dashboard/ClickableRow'
import { DeleteCandidateButton } from '@/components/dashboard/DeleteCandidateButton'
import {
  formatDate,
  formatEmploymentType,
  getScoreColor,
  getStatusColor,
  getRecommendationLabel,
  getRecommendationColor,
} from '@/lib/utils/formatting'

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

  const stats = {
    total: applications?.length ?? 0,
    screened: applications?.filter((a) => a.ai_screening).length ?? 0,
    shortlisted: applications?.filter((a) => a.status === 'shortlisted' || a.status === 'interview').length ?? 0,
    avgScore:
      applications && applications.length > 0
        ? Math.round(
            applications
              .filter((a) => a.ai_screening?.score != null)
              .reduce((sum, a) => sum + (a.ai_screening?.score ?? 0), 0) /
              Math.max(1, applications.filter((a) => a.ai_screening).length)
          )
        : null,
  }

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Applications', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'AI Screened', value: stats.screened, color: 'text-brand-600', bg: 'bg-white' },
          { label: 'Shortlisted', value: stats.shortlisted, color: 'text-emerald-600', bg: 'bg-white' },
          {
            label: 'Avg AI Score',
            value: stats.avgScore != null ? `${stats.avgScore}/100` : '—',
            color: stats.avgScore != null ? (stats.avgScore >= 70 ? 'text-emerald-600' : stats.avgScore >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-gray-300',
            bg: 'bg-white',
          },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl border border-stone-200 p-5 shadow-sm`}>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Applications table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between" style={{ backgroundColor: '#fdfaf6' }}>
          <h2 className="text-sm font-semibold text-gray-800">Applications</h2>
          {job.status === 'open' && (
            <Link
              href={`/careers/${id}/apply`}
              target="_blank"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              Public apply link
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>

        {!applications || applications.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No applications yet.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-stone-100">
            <thead style={{ backgroundColor: '#faf6ef' }}>
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  AI Score
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider hidden md:table-cell">
                  Recommendation
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider hidden lg:table-cell">
                  Applied
                </th>
                <th className="relative px-6 py-3.5">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {applications
                .sort((a, b) => (b.ai_screening?.score ?? -1) - (a.ai_screening?.score ?? -1))
                .map((app) => (
                  <ClickableRow key={app.id} href={`/dashboard/candidates/${app.id}`}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">{app.applicant_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{app.applicant_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {app.ai_screening ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getScoreColor(app.ai_screening.score)}`}
                        >
                          {app.ai_screening.score}/100
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">
                          {app.status === 'screening' ? 'Analyzing...' : 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {app.ai_screening?.recommendation && (
                        <Badge className={getRecommendationColor(app.ai_screening.recommendation)}>
                          {getRecommendationLabel(app.ai_screening.recommendation)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 hidden lg:table-cell">
                      {formatDate(app.submitted_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DeleteCandidateButton
                          applicationId={app.id}
                          candidateName={app.applicant_name}
                          compact
                        />
                        <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </ClickableRow>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
