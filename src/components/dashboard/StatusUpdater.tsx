'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EMAIL_TEMPLATES, fillTemplate } from '@/lib/email/templates'
import type { ApplicationStatus } from '@/types/database'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'pending', label: 'New' },
  { value: 'interview_invited', label: 'Interview Invited' },
  { value: 'interview', label: 'Interview Scheduled' },
  { value: 'offer', label: 'Offer Extended' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
]

// Statuses that trigger an auto-email popup
const AUTO_EMAIL: Partial<Record<ApplicationStatus, string>> = {
  rejected: 'rejection',
  interview_invited: 'interview_invitation',
}

const C = { caramel: '#C4A882', caramelDark: '#A8845E', border: '#E8E2D8', muted: '#78716C' }

interface StatusUpdaterProps {
  applicationId: string
  currentStatus: ApplicationStatus
  candidateName: string
  candidateEmail: string
  jobTitle: string
  hrName: string
}

export function StatusUpdater({
  applicationId,
  currentStatus,
  candidateName,
  candidateEmail,
  jobTitle,
  hrName,
}: StatusUpdaterProps) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)

  // Auto-email popup state
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sending, setSending] = useState(false)
  const [popupError, setPopupError] = useState<string | null>(null)

  const vars = { candidate_name: candidateName, job_title: jobTitle, hr_name: hrName }

  function handleChange(newStatus: ApplicationStatus) {
    if (newStatus === status) return

    const templateId = AUTO_EMAIL[newStatus]
    if (templateId) {
      // Show popup before committing
      const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId)!
      setEmailSubject(fillTemplate(tpl.subject, vars))
      setEmailBody(fillTemplate(tpl.body, vars))
      setPendingStatus(newStatus)
      setPopupError(null)
    } else {
      // Just update status
      commitStatus(newStatus)
    }
  }

  async function commitStatus(newStatus: ApplicationStatus) {
    setSaving(true)
    setStatus(newStatus)
    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      router.refresh()
    } catch {
      setStatus(currentStatus)
      alert('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendAndUpdate() {
    if (!pendingStatus) return
    if (!emailSubject.trim() || !emailBody.trim()) {
      setPopupError('Subject and body are required.')
      return
    }
    setSending(true)
    setPopupError(null)

    try {
      // Send email
      const emailRes = await fetch(`/api/applications/${applicationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject.trim(), body: emailBody.trim() }),
      })
      const emailData = await emailRes.json()
      if (!emailRes.ok) throw new Error(emailData.error ?? 'Failed to send email')

      // Update status
      await commitStatus(pendingStatus)
      setPendingStatus(null)
    } catch (err) {
      setPopupError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }

  async function handleSkip() {
    if (!pendingStatus) return
    setSending(true)
    await commitStatus(pendingStatus)
    setPendingStatus(null)
    setSending(false)
  }

  function handleCancel() {
    setPendingStatus(null)
    setPopupError(null)
  }

  const displayLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label
    ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')

  return (
    <>
      <div className="flex items-center gap-2">
        {saving && (
          <svg className="animate-spin h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value as ApplicationStatus)}
          disabled={saving}
          className="text-xs py-1.5 px-2 w-40 border border-stone-200 rounded-lg text-gray-700 focus:outline-none disabled:opacity-50 bg-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {/* Show current status if not in the list (e.g. screening/screened) */}
          {!STATUS_OPTIONS.find((o) => o.value === status) && (
            <option value={status} disabled>{displayLabel}</option>
          )}
        </select>
      </div>

      {/* Auto-email popup */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={handleCancel}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100" style={{ background: 'linear-gradient(to right, #fdf9f4, #fff)' }}>
              <h2 className="text-sm font-semibold text-gray-900">
                Send email to {candidateName}?
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Status will change to <strong>{STATUS_OPTIONS.find((o) => o.value === pendingStatus)?.label}</strong>.
                You can edit or skip sending the email.
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">To</label>
                <p className="text-sm text-gray-600">{candidateName} &lt;{candidateEmail}&gt;</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none resize-y"
                  style={{ fontFamily: 'inherit', lineHeight: 1.6, minHeight: '180px' }}
                />
              </div>
              {popupError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{popupError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSkip}
                disabled={sending}
                className="px-4 py-2 text-sm font-medium text-gray-500 border border-stone-200 hover:bg-stone-50 rounded-lg transition-colors disabled:opacity-50 ml-auto"
              >
                Skip, just update status
              </button>
              <button
                onClick={handleSendAndUpdate}
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
                    Sending…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Email &amp; Update Status
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
