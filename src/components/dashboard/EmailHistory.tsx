'use client'

import type { CandidateEmail } from '@/types/database'

interface EmailHistoryProps {
  emails: CandidateEmail[]
  onReply?: (replySubject: string) => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function initial(name: string): string {
  return (name?.trim()?.[0] ?? '?').toUpperCase()
}

/**
 * Strip quoted reply history from an inbound email body.
 * Keeps only the text before the first recognized quote marker.
 */
function stripQuotedReply(body: string): string {
  const lines = body.split('\n')
  const cutAt: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()

    // Lines consisting entirely of > quotes
    if (/^>/.test(trimmed)) { cutAt.push(i); break }

    // "-----Original Message-----" or similar dividers
    if (/^-{3,}.*message.*-{3,}/i.test(trimmed)) { cutAt.push(i); break }

    // "From:" at the start of a line (common in forwarded/reply blocks)
    if (/^From:\s/i.test(trimmed)) { cutAt.push(i); break }

    // German Gmail: "Am Mo., 10. Apr. 2026 um 16:31 Uhr schrieb ..."
    // English: "On Mon, Apr 10, 2026 at 4:31 PM ... wrote:"
    if (/^(Am |On )(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Mo|Di|Mi|Do|Fr|Sa|So)/.test(trimmed)) {
      cutAt.push(i); break
    }
  }

  if (cutAt.length === 0) return body.trim()

  const before = lines.slice(0, cutAt[0]).join('\n').trim()
  return before.length > 0 ? before : body.trim()
}

export function EmailHistory({ emails, onReply }: EmailHistoryProps) {
  const sentCount = emails.filter((e) => e.direction !== 'inbound' && e.status !== 'scheduled').length
  const scheduledCount = emails.filter((e) => e.status === 'scheduled').length
  const inboundCount = emails.filter((e) => e.direction === 'inbound').length

  const countParts: string[] = []
  if (sentCount > 0) countParts.push(`${sentCount} sent`)
  if (inboundCount > 0) countParts.push(`${inboundCount} received`)
  if (scheduledCount > 0) countParts.push(`${scheduledCount} scheduled`)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-100"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Email Thread</h2>
        {countParts.length > 0 && (
          <span className="ml-auto text-xs text-stone-400">{countParts.join(' · ')}</span>
        )}
      </div>

      {/* Thread */}
      {emails.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <svg className="w-8 h-8 text-stone-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-stone-400">No emails yet.</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: '560px' }}>
          {emails.map((email) => {
            const isInbound = email.direction === 'inbound'
            const isScheduled = email.status === 'scheduled'
            const displayTime = isScheduled && email.send_at ? email.send_at : email.sent_at
            const senderInitial = initial(email.sent_by_name)

            return (
              <div
                key={email.id}
                className={`flex gap-2 items-end ${isInbound ? '' : 'flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={
                    isInbound
                      ? { backgroundColor: '#dbeafe', color: '#1d4ed8' }
                      : { backgroundColor: '#C4A882', color: '#fff' }
                  }
                >
                  {senderInitial}
                </div>

                {/* Bubble column */}
                <div className="min-w-0 max-w-[78%] group">
                  {/* Subject */}
                  <p
                    className="text-xs font-semibold text-stone-500 mb-1 px-1 truncate"
                    style={{ textAlign: isInbound ? 'left' : 'right' }}
                  >
                    {email.subject}
                    {isScheduled && (
                      <span className="ml-1.5 font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Scheduled
                      </span>
                    )}
                  </p>

                  {/* Bubble — with hover reply button for inbound */}
                  <div className="relative">
                    <div
                      className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
                      style={
                        isInbound
                          ? {
                              backgroundColor: '#ffffff',
                              color: '#111827',
                              border: '1px solid #e5e7eb',
                              borderRadius: '16px 16px 16px 4px',
                            }
                          : {
                              backgroundColor: '#C4A882',
                              color: '#ffffff',
                              borderRadius: '16px 16px 4px 16px',
                            }
                      }
                    >
                      {isInbound ? stripQuotedReply(email.body) : email.body}
                    </div>

                    {/* Reply button — inbound only, appears on hover at right edge */}
                    {isInbound && onReply && (
                      <button
                        type="button"
                        onClick={() => onReply(`Re: ${email.subject}`)}
                        title="Reply"
                        className="absolute -right-8 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#e5e7eb'
                          e.currentTarget.style.color = '#374151'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6'
                          e.currentTarget.style.color = '#6b7280'
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <p
                    className="text-xs text-stone-400 mt-1 px-1"
                    style={{ textAlign: isInbound ? 'left' : 'right' }}
                  >
                    {isScheduled ? 'Sends ' : ''}
                    {formatTime(displayTime)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
