import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { JobActions } from '@/components/dashboard/JobActions'
import { ClickableRow } from '@/components/dashboard/ClickableRow'
import { formatDate, formatEmploymentType } from '@/lib/utils/formatting'
import { UnreadRepliesWidget } from '@/components/dashboard/UnreadRepliesWidget'
import { InterviewCalendar } from '@/components/dashboard/InterviewCalendar'

export default async function JobsPage() {
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

  let query = supabase
    .from('jobs')
    .select('*, hiring_manager:profiles!jobs_hiring_manager_id_fkey(id, full_name, email, role, created_at)')
    .order('created_at', { ascending: false })

  if (profile.role === 'hiring_manager') {
    query = query.eq('hiring_manager_id', user.id) as typeof query
  }

  const { data: jobs } = await query

  // Fetch upcoming interviews for the calendar
  const admin = createAdminClient()
  const now = new Date().toISOString()

  let interviewQuery = admin
    .from('interviews')
    .select(`
      id, application_id, scheduled_at, duration_minutes, interview_type, location,
      applications!inner ( applicant_name, jobs!inner ( title, hiring_manager_id ) )
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // last 30 days + future
    .order('scheduled_at', { ascending: true })

  if (profile.role === 'hiring_manager') {
    interviewQuery = interviewQuery.contains('interviewer_emails', [profile.email]) as typeof interviewQuery
  }

  const { data: rawInterviews } = await interviewQuery

  const calendarInterviews = (rawInterviews ?? []).map((iv) => {
    const app = iv.applications as unknown as { applicant_name: string; jobs: { title: string } }
    return {
      id: iv.id,
      application_id: iv.application_id,
      scheduled_at: iv.scheduled_at,
      duration_minutes: iv.duration_minutes,
      interview_type: iv.interview_type,
      location: iv.location,
      applicant_name: app.applicant_name,
      job_title: app.jobs.title,
    }
  })

  void now // suppress unused var warning

  const statusColor = (status: string) => {
    if (status === 'open') return 'text-emerald-700 bg-emerald-50 border border-emerald-200'
    if (status === 'closed') return 'text-red-600 bg-red-50 border border-red-200'
    return 'text-stone-500 bg-stone-100 border border-stone-200'
  }

  return (
    <div>
      {/* Dashboard widgets */}
      <UnreadRepliesWidget userId={user.id} role={profile.role} />
      <InterviewCalendar interviews={calendarInterviews} />

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif-display" style={{ fontSize: '1.6rem', color: '#1A1A1A' }}>
            {profile.role === 'admin' ? 'All Jobs' : 'My Assigned Jobs'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {jobs?.length ?? 0} position{(jobs?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {profile.role === 'admin' && (
          <Link href="/dashboard/jobs/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a Job
            </Button>
          </Link>
        )}
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-700 mb-1.5">No jobs yet</h2>
          <p className="text-sm text-gray-400 mb-6">
            {profile.role === 'admin'
              ? 'Create your first job posting to get started.'
              : 'You have no assigned jobs yet. Contact your admin.'}
          </p>
          {profile.role === 'admin' && (
            <Link href="/dashboard/jobs/new">
              <Button>Post first job</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-stone-100">
            <thead style={{ backgroundColor: '#faf6ef' }}>
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider hidden md:table-cell">
                  Hiring Manager
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider hidden lg:table-cell">
                  Posted
                </th>
                <th className="relative px-6 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-100">
              {jobs.map((job) => (
                <ClickableRow key={job.id} href={`/dashboard/jobs/${job.id}`}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {job.department && (
                          <span className="text-xs text-gray-400">{job.department}</span>
                        )}
                        {job.location && (
                          <span className="text-xs text-gray-400">· {job.location}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          · {formatEmploymentType(job.employment_type)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={statusColor(job.status)}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-sm text-gray-500">
                      {(job.hiring_manager as { full_name?: string } | null)?.full_name ?? (
                        <span className="text-gray-300 italic">Unassigned</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 hidden lg:table-cell">
                    {formatDate(job.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <JobActions
                      jobId={job.id}
                      jobTitle={job.title}
                      jobStatus={job.status}
                      isAdmin={profile.role === 'admin'}
                    />
                  </td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
