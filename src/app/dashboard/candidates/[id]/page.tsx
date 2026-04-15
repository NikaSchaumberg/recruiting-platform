import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { CandidateNotes } from '@/components/dashboard/CandidateNotes'
import { StatusUpdater } from '@/components/dashboard/StatusUpdater'
import { EmailThreadPanel } from '@/components/dashboard/EmailThreadPanel'
import { DeleteCandidateButton } from '@/components/dashboard/DeleteCandidateButton'
import { CommunicationLog } from '@/components/dashboard/CommunicationLog'
import { ScheduleInterviewWizard } from '@/components/dashboard/ScheduleInterviewWizard'
import {
  formatDate,
  getScoreColor,
  getRecommendationLabel,
  getRecommendationColor,
  getStatusColor,
} from '@/lib/utils/formatting'
import type { CandidateEmail, CandidateMessage } from '@/types/database'

// ── Types for application_data jsonb ──────────────────────────────────────────

type AppData = {
  personal?: {
    firstName?: string; lastName?: string; email?: string; phone?: string
    address?: string; city?: string; state?: string; zip?: string; dateOfBirth?: string
  }
  skills?: string[]
  workExperience?: Array<{
    employer?: string; jobTitle?: string; tasks?: string; startDate?: string; endDate?: string
    city?: string; state?: string; address?: string; phone?: string; mayContact?: boolean
  }>
  education?: Array<{
    school?: string; country?: string; degree?: string; major?: string; graduationDate?: string
  }>
  references?: Array<{
    fullName?: string; relationship?: string; company?: string; phone?: string; email?: string
  }>
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div
        className="flex items-center gap-2.5 px-6 py-4 border-b border-stone-100"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export default async function CandidateDetailPage({
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

  const { data: application } = await supabase
    .from('applications')
    .select('*, job:jobs(*), ai_screening:ai_screenings(*)')
    .eq('id', id)
    .single()

  if (!application) notFound()

  if (
    profile.role === 'hiring_manager' &&
    application.job?.hiring_manager_id !== user.id
  ) {
    redirect('/dashboard/jobs')
  }

  const adminClient = createAdminClient()

  // Fetch offer and contract status
  const [{ data: offer }, { data: contract }, { data: signedUrlData }] = await Promise.all([
    adminClient.from('offers').select('id, status, sent_at').eq('application_id', id).maybeSingle(),
    adminClient.from('contracts').select('id, status, sent_at').eq('application_id', id).maybeSingle(),
    adminClient.storage.from('cvs').createSignedUrl(application.cv_path, 3600),
  ])

  const cvUrl = signedUrlData?.signedUrl ?? null
  const offerSent = offer?.status === 'sent' || offer?.status === 'signed'
  const contractSent = contract?.status === 'sent' || contract?.status === 'signed'
  const canManageOffer = profile.role === 'admin' || profile.role === 'hiring_manager'

  // Fetch email history, messages, interviews, and team members
  const [{ data: rawEmails }, { data: rawMessages }, { data: rawInterviews }, { data: rawTeam }] = await Promise.all([
    adminClient
      .from('candidate_emails')
      .select('*')
      .eq('application_id', id)
      .order('sent_at', { ascending: true }),
    adminClient
      .from('candidate_messages')
      .select('*')
      .eq('application_id', id)
      .order('sent_at', { ascending: true }),
    adminClient
      .from('interviews')
      .select('*')
      .eq('application_id', id)
      .order('scheduled_at', { ascending: true }),
    adminClient
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'hiring_manager'])
      .order('full_name', { ascending: true }),
  ])

  // Mark all unread inbound emails for this application as read
  adminClient
    .from('candidate_emails')
    .update({ read: true })
    .eq('application_id', id)
    .eq('direction', 'inbound')
    .eq('read', false)
    .then(() => {})

  const emails = (rawEmails ?? []) as CandidateEmail[]
  const messages = (rawMessages ?? []) as CandidateMessage[]
  const interviews = (rawInterviews ?? []) as {
    id: string; scheduled_at: string; duration_minutes: number
    interview_type: string; location: string | null; notes: string | null; status: string
    interviewer_emails: string[]; graph_event_id: string | null
  }[]
  const teamMembers = (rawTeam ?? []) as {
    id: string; full_name: string; email: string; role: string
  }[]

  const screening = application.ai_screening as {
    score: number
    summary: string
    strengths: string[]
    gaps: string[]
    recommendation: string
    screened_at: string
  } | null

  const appData = (application.application_data ?? null) as AppData | null
  const personal = appData?.personal
  const skills = appData?.skills?.filter(Boolean) ?? []
  const workExp = (appData?.workExperience ?? []).filter(w => w.employer || w.jobTitle)
  const education = (appData?.education ?? []).filter(e => e.school)
  const references = (appData?.references ?? []).filter(r => r.fullName)

  // Address display helper
  const addressLine = [personal?.address, personal?.city, personal?.state, personal?.zip]
    .filter(Boolean).join(', ')

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
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
        <span className="text-stone-600 font-medium">{application.applicant_name}</span>
        <div className="ml-auto">
          <DeleteCandidateButton
            applicationId={id}
            candidateName={application.applicant_name}
            redirectTo="/dashboard/jobs"
          />
        </div>
      </div>

      {/* Two-column layout: 60 / 40 */}
      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: '3fr 2fr' }}>

        {/* ── LEFT COLUMN (60%) ─────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Candidate card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-700 font-bold text-xl">
                    {application.applicant_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900">{application.applicant_name}</h1>
                  <a href={`mailto:${application.applicant_email}`} className="text-sm text-brand-600 hover:text-brand-700 transition-colors">
                    {application.applicant_email}
                  </a>
                  {application.phone && (
                    <p className="text-sm text-gray-400 mt-0.5">{application.phone}</p>
                  )}
                  {application.linkedin_url && (
                    <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-1">
                      LinkedIn
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusUpdater
                  applicationId={id}
                  currentStatus={application.status}
                  candidateName={application.applicant_name}
                  candidateEmail={application.applicant_email}
                  jobTitle={application.job?.title ?? ''}
                  hrName={profile.full_name}
                />
                <ScheduleInterviewWizard
                  applicationId={id}
                  candidateName={application.applicant_name}
                  candidateEmail={application.applicant_email}
                  jobTitle={application.job?.title ?? ''}
                  existingInterviews={interviews}
                  teamMembers={teamMembers}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-stone-100">
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Applied</p>
                <p className="text-sm font-medium text-gray-700">{formatDate(application.submitted_at)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Position</p>
                <p className="text-sm font-medium text-gray-700">{application.job?.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Status</p>
                <Badge className={getStatusColor(application.status)}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1).replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            {/* Offer / Contract actions */}
            {canManageOffer && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-stone-100">
                <Link
                  href={`/dashboard/candidates/${id}/offer`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                  style={offerSent
                    ? { color: '#15803d', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
                    : { color: '#374151', backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {offerSent ? 'Offer Sent' : offer ? 'View Offer' : 'Create Offer'}
                </Link>

                {offerSent && (
                  <Link
                    href={`/dashboard/candidates/${id}/contract`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                    style={contractSent
                      ? { color: '#15803d', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
                      : { color: '#92400e', backgroundColor: '#fffbeb', borderColor: '#fde68a' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {contractSent ? 'Contract Sent' : 'Send Contract'}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* AI Screening Results */}
          {screening ? (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100" style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">AI Screening Report</h2>
                </div>
                <span className="text-xs text-stone-400">Screened {formatDate(screening.screened_at)}</span>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold border-4 ${
                      screening.score >= 75 ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                      : screening.score >= 50 ? 'border-amber-200 text-amber-700 bg-amber-50'
                      : 'border-red-200 text-red-700 bg-red-50'
                    }`}>
                      {screening.score}
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5">out of 100</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Recommendation</p>
                    <Badge className={`text-sm px-3 py-1 ${getRecommendationColor(screening.recommendation)}`}>
                      {getRecommendationLabel(screening.recommendation)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2.5">Summary</h3>
                  <p className="text-sm text-gray-700 leading-relaxed rounded-xl p-4" style={{ backgroundColor: '#faf6ef' }}>
                    {screening.summary}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Strengths
                    </h3>
                    <ul className="space-y-2">
                      {screening.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Gaps / Concerns
                    </h3>
                    <ul className="space-y-2">
                      {screening.gaps.length === 0 ? (
                        <li className="text-sm text-stone-400 italic">None identified</li>
                      ) : screening.gaps.map((g, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>{g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center shadow-sm">
              {application.status === 'screening' ? (
                <>
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-brand-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">AI Screening in Progress</p>
                  <p className="text-xs text-stone-400 mt-1">Results will appear shortly. Refresh to check.</p>
                </>
              ) : (
                <p className="text-sm text-stone-400">No AI screening yet.</p>
              )}
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <Section title="Skills" icon={
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-brand-700 border border-brand-200" style={{ backgroundColor: '#fdf6ec' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Work Experience */}
          {workExp.length > 0 && (
            <Section title="Work Experience" icon={
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }>
              <div className="space-y-5">
                {workExp.map((w, i) => (
                  <div key={i} className={i > 0 ? 'pt-5 border-t border-stone-100' : ''}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{w.jobTitle || '—'}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{w.employer}</p>
                        {(w.city || w.state) && (
                          <p className="text-xs text-stone-400 mt-0.5">{[w.city, w.state].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                      {(w.startDate || w.endDate) && (
                        <span className="text-xs text-stone-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                          {w.startDate || '?'} – {w.endDate || 'Present'}
                        </span>
                      )}
                    </div>
                    {w.tasks && <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{w.tasks}</p>}
                    {w.mayContact === false && <p className="text-xs text-amber-600 mt-1.5">Do not contact employer</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <Section title="Education" icon={
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            }>
              <div className="space-y-4">
                {education.map((e, i) => (
                  <div key={i} className={i > 0 ? 'pt-4 border-t border-stone-100' : ''}>
                    <p className="text-sm font-semibold text-gray-900">{e.school}</p>
                    {(e.degree || e.major) && (
                      <p className="text-sm text-gray-600 mt-0.5">{[e.degree, e.major].filter(Boolean).join(' · ')}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {e.country && <span className="text-xs text-stone-400">{e.country}</span>}
                      {e.graduationDate && <span className="text-xs text-stone-400">Graduated {e.graduationDate}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* References */}
          {references.length > 0 && (
            <Section title="References" icon={
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }>
              <div className="grid grid-cols-2 gap-4">
                {references.map((r, i) => (
                  <div key={i} className="rounded-xl border border-stone-100 p-4" style={{ backgroundColor: '#fdfaf6' }}>
                    <p className="text-sm font-semibold text-gray-900">{r.fullName}</p>
                    {r.relationship && <p className="text-xs text-stone-500 mt-0.5">{r.relationship}</p>}
                    {r.company && <p className="text-xs text-stone-400 mt-0.5">{r.company}</p>}
                    <div className="mt-2 space-y-1">
                      {r.phone && <p className="text-xs text-gray-500">{r.phone}</p>}
                      {r.email && <a href={`mailto:${r.email}`} className="text-xs text-brand-600 hover:text-brand-700">{r.email}</a>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Personal Info */}
          {(addressLine || personal?.dateOfBirth) && (
            <Section title="Personal Information" icon={
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }>
              <div className="grid grid-cols-2 gap-4">
                {addressLine && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Address</p>
                    <p className="text-sm text-gray-700">{addressLine}</p>
                  </div>
                )}
                {personal?.dateOfBirth && (
                  <div>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Date of Birth</p>
                    <p className="text-sm text-gray-700">{personal.dateOfBirth}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Cover Letter */}
          {application.cover_letter && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Cover Letter</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{application.cover_letter}</p>
            </div>
          )}

          {/* CV / Resume preview */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between" style={{ backgroundColor: '#fdfaf6' }}>
              <h2 className="text-sm font-semibold text-gray-800">CV / Resume</h2>
              {cvUrl && (
                <a
                  href={cvUrl}
                  download={application.cv_filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </a>
              )}
            </div>
            {cvUrl ? (
              <iframe src={cvUrl} className="w-full" style={{ height: '600px' }} title="Candidate CV" />
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-stone-400">CV not available</p>
              </div>
            )}
          </div>

        </div>{/* end left column */}

        {/* ── RIGHT COLUMN (40%) — sticky, own scroll ───────────────────── */}
        <div
          className="space-y-4"
          style={{
            position: 'sticky',
            top: '24px',
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
          }}
        >
          {/* Email thread — Send Email button + conversation view */}
          <EmailThreadPanel
            emails={emails}
            applicationId={id}
            candidateName={application.applicant_name}
            candidateEmail={application.applicant_email}
            jobTitle={application.job?.title ?? ''}
            hrName={profile.full_name}
          />

          {/* Communication Log */}
          <CommunicationLog
            applicationId={id}
            currentUserId={user.id}
            currentUserName={profile.full_name}
            initialMessages={messages}
          />

          {/* Private Notes */}
          <CandidateNotes
            applicationId={id}
            initialNotes={application.hr_notes ?? null}
          />
        </div>

      </div>
    </div>
  )
}
