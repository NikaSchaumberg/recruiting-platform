'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EMAIL_TEMPLATES, fillTemplate } from '@/lib/email/templates'
import type { ApplicationStatus } from '@/types/database'

const PIPELINE_STAGES: { value: ApplicationStatus; label: string }[] = [
  { value: 'pending',          label: 'New' },
  { value: 'first_interview',  label: '1st Interview' },
  { value: 'second_interview', label: '2nd Interview' },
  { value: 'offer',            label: 'Offer' },
  { value: 'rejected',         label: 'Rejected' },
  { value: 'hired',            label: 'Hired' },
]

// Statuses that show an auto-email popup before committing
const AUTO_EMAIL: Partial<Record<ApplicationStatus, string>> = {
  first_interview:  'first_interview_invitation',
  second_interview: 'second_interview_invitation',
  rejected:         'rejection',
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

  // Hired congrats modal
  const [showHiredModal, setShowHiredModal] = useState(false)

  const vars = { candidate_name: candidateName, job_title: jobTitle, hr_name: hrName }

  function handleChange(newStatus: ApplicationStatus) {
    if (newStatus === status) return

    if (newStatus === 'offer') {
      // Update status first, then navigate to offer page
      commitStatus('offer').then(() => {
        router.push(`/dashboard/candidates/${applicationId}/offer`)
      })
      return
    }

    if (newStatus === 'hired') {
      commitStatus('hired').then(() => setShowHiredModal(true))
      return
    }

    const templateId = AUTO_EMAIL[newStatus]
    if (templateId) {
      const tpl = EMAIL_TEMPLATES.find((t) => t.id === templateId)!
      setEmailSubject(fillTemplate(tpl.subject, vars))
      setEmailBody(fillTemplate(tpl.body, vars))
      setPendingStatus(newStatus)
      setPopupError(null)
    } else {
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
      const emailRes = await fetch(`/api/applications/${applicationId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject.trim(), body: emailBody.trim() }),
      })
      const emailData = await emailRes.json()
      if (!emailRes.ok) throw new Error(emailData.error ?? 'Failed to send email')
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

  const displayLabel =
    PIPELINE_STAGES.find((o) => o.value === status)?.label ??
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')

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
          className="text-xs py-1.5 px-2 w-44 border border-stone-200 rounded-lg text-gray-700 focus:outline-none disabled:opacity-50 bg-white"
        >
          {PIPELINE_STAGES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
          {/* Show current DB status if it's a system/AI status not in the pipeline */}
          {!PIPELINE_STAGES.find((o) => o.value === status) && (
            <option value={status} disabled>{displayLabel}</option>
          )}
        </select>
      </div>

      {/* ── Auto-email popup ───────────────────────────────────────── */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
            onClick={handleCancel}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="px-6 py-4 border-b border-stone-100" style={{ background: 'linear-gradient(to right, #fdf9f4, #fff)' }}>
              <h2 className="text-sm font-semibold text-gray-900">
                Send email to {candidateName}?
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Status will change to <strong>{PIPELINE_STAGES.find((o) => o.value === pendingStatus)?.label}</strong>.
                {' '}You can edit or skip the email.
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

      {/* ── Hired congratulations modal ────────────────────────────── */}
      {showHiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Congratulations!</h2>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{candidateName}</strong> has been marked as <strong>Hired</strong> for <strong>{jobTitle}</strong>.
            </p>
            <button
              onClick={() => setShowHiredModal(false)}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: C.caramel }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
