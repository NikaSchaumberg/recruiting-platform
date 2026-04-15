import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

interface UnreadEmail {
  id: string
  application_id: string
  subject: string
  body: string
  from_name: string | null
  from_email: string | null
  sent_at: string
  applicant_name: string
  job_title: string
}

async function getUnreadReplies(userId: string, role: string) {
  const admin = createAdminClient()

  let query = admin
    .from('candidate_emails')
    .select(`
      id,
      application_id,
      subject,
      body,
      from_name,
      from_email,
      sent_at,
      applications!inner (
        applicant_name,
        jobs!inner ( title, hiring_manager_id )
      )
    `)
    .eq('direction', 'inbound')
    .eq('read', false)
    .order('sent_at', { ascending: false })
    .limit(10)

  // Hiring managers only see their own jobs
  if (role === 'hiring_manager') {
    query = query.eq('applications.jobs.hiring_manager_id', userId) as typeof query
  }

  const { data, error } = await query
  if (error) {
    console.error('[UnreadReplies] Query error:', error.message)
    return []
  }

  return (data ?? []).map((row) => {
    const app = row.applications as unknown as { applicant_name: string; jobs: { title: string } }
    return {
      id: row.id,
      application_id: row.application_id,
      subject: row.subject,
      body: row.body,
      from_name: row.from_name,
      from_email: row.from_email,
      sent_at: row.sent_at,
      applicant_name: app.applicant_name,
      job_title: app.jobs.title,
    } as UnreadEmail
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function bodyPreview(body: string) {
  // Strip quoted reply history: cut at first > line, "From:", or similar
  const lines = body.split('\n')
  const cut = lines.findIndex((l) => /^>|^From:\s|^-{3,}/i.test(l.trimStart()))
  const clean = (cut > 0 ? lines.slice(0, cut) : lines).join(' ').trim()
  return clean.length > 120 ? clean.slice(0, 120) + '…' : clean
}

export async function UnreadRepliesWidget({
  userId,
  role,
}: {
  userId: string
  role: string
}) {
  const replies = await getUnreadReplies(userId, role)

  if (replies.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6">
      <div
        className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-100"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#fef2f2' }}>
          <svg className="w-4 h-4" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Unread Replies</h2>
        <span
          className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#dc2626', color: '#fff' }}
        >
          {replies.length}
        </span>
      </div>

      <ul className="divide-y divide-stone-100">
        {replies.map((reply) => (
          <li key={reply.id}>
            <Link
              href={`/dashboard/candidates/${reply.application_id}`}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors group"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
              >
                {(reply.from_name ?? reply.applicant_name).charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {reply.applicant_name}
                  </p>
                  <span className="text-xs text-stone-400 flex-shrink-0">{timeAgo(reply.sent_at)}</span>
                </div>
                <p className="text-xs text-stone-500 truncate">{reply.job_title} · {reply.subject}</p>
                <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{bodyPreview(reply.body)}</p>
              </div>

              <svg
                className="w-4 h-4 text-stone-300 group-hover:text-stone-400 flex-shrink-0 mt-1 transition-colors"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
