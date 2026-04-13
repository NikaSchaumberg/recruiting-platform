'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EMAIL_TEMPLATES, fillTemplate, type TemplateId } from '@/lib/email/templates'

interface EmailComposeProps {
  applicationId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  hrName: string
  /** If provided, pre-selects a template and opens the modal immediately */
  defaultTemplateId?: TemplateId
  /** Render as a standalone "Send Email" button (default) or inline trigger */
  trigger?: React.ReactNode
  onClose?: () => void
  forceOpen?: boolean
  /**
   * When set to a non-empty string, opens the compose panel with that subject
   * pre-filled (used by the "Reply" button in EmailHistory).
   * The parent should clear this back to null after the panel opens.
   */
  pendingSubject?: string | null
  onPendingClear?: () => void
}

const C = { caramel: '#C4A882', caramelDark: '#A8845E', border: '#E8E2D8', muted: '#78716C' }

// Return a local datetime string suitable for datetime-local input min value
function nowLocalMin(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 5) // at least 5 min from now
  return d.toISOString().slice(0, 16)
}

// Default to 1 day from now, rounded to next hour
function defaultScheduledAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setMinutes(0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export function EmailCompose({
  applicationId,
  candidateName,
  candidateEmail,
  jobTitle,
  hrName,
  defaultTemplateId,
  trigger,
  onClose,
  forceOpen = false,
  pendingSubject,
  onPendingClear,
}: EmailComposeProps) {
  const router = useRouter()
  const [open, setOpen] = useState(forceOpen)
  const [templateId, setTemplateId] = useState<TemplateId>(defaultTemplateId ?? 'custom')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scheduling state
  const [mode, setMode] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt)

  const vars = { candidate_name: candidateName, job_title: jobTitle, hr_name: hrName }

  // Open with a pre-filled subject when the Reply button is clicked in EmailHistory
  useEffect(() => {
    if (pendingSubject) {
      setSubject(pendingSubject)
      setBody('')
      setTemplateId('custom')
      setMode('now')
      setError(null)
      setOpen(true)
      onPendingClear?.()
    }
  }, [pendingSubject, onPendingClear])

  function openWithTemplate(tid: TemplateId) {
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === tid)!
    setTemplateId(tid)
    setSubject(fillTemplate(tpl.subject, vars))
    setBody(fillTemplate(tpl.body, vars))
    setError(null)
    setMode('now')
    setOpen(true)
  }

  function handleTemplateChange(tid: TemplateId) {
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === tid)!
    setTemplateId(tid)
    setSubject(fillTemplate(tpl.subject, vars))
    setBody(fillTemplate(tpl.body, vars))
  }

  function handleClose() {
    setOpen(false)
    setError(null)
    onClose?.()
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message body are required.')
      return
    }
    if (mode === 'later' && !scheduledAt) {
      setError('Please select a date and time to schedule this email.')
      return
    }

    setSending(true)
    setError(null)
    try {
      const payload: Record<string, string> = { subject: subject.trim(), body: body.trim() }
      if (mode === 'later') {
        payload.scheduledAt = new Date(scheduledAt).toISOString()
      }

      const res = await fetch(`/api/applications/${applicationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send')
      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Trigger */}
      {!forceOpen && (
        trigger ? (
          <span onClick={() => openWithTemplate(defaultTemplateId ?? 'custom')}>{trigger}</span>
        ) : (
          <button
            onClick={() => openWithTemplate('custom')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: C.caramel }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = C.caramelDark)}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = C.caramel)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Email
          </button>
        )
      )}

      {/* Modal */}
      {(open || forceOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={handleClose}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100" style={{ background: 'linear-gradient(to right, #fdf9f4, #fff)' }}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Send Email</h2>
                <p className="text-xs text-stone-400 mt-0.5">To: {candidateName} &lt;{candidateEmail}&gt;</p>
              </div>
              <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Template selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">
                  Use Template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value as TemplateId)}
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none"
                >
                  {EMAIL_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Write your message..."
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none resize-y"
                  style={{ minHeight: '200px', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              </div>

              {/* Send timing toggle */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                  When to Send
                </label>
                <div className="flex rounded-lg border border-stone-200 overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => setMode('now')}
                    className="flex-1 py-2 font-medium transition-colors"
                    style={{
                      backgroundColor: mode === 'now' ? C.caramel : 'white',
                      color: mode === 'now' ? 'white' : C.muted,
                    }}
                  >
                    Send now
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('later')}
                    className="flex-1 py-2 font-medium transition-colors border-l border-stone-200"
                    style={{
                      backgroundColor: mode === 'later' ? C.caramel : 'white',
                      color: mode === 'later' ? 'white' : C.muted,
                    }}
                  >
                    Schedule for later
                  </button>
                </div>

                {mode === 'later' && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={nowLocalMin()}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none"
                    />
                    <p className="text-xs text-stone-400 flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Scheduled emails require the server to be running at send time. The email will be saved and can be sent manually if needed.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: sending ? C.border : C.caramel }}
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === 'later' ? 'Scheduling…' : 'Sending…'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mode === 'later' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      )}
                    </svg>
                    {mode === 'later' ? 'Schedule Email' : 'Send Email'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
