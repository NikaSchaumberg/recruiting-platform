'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface OfferData {
  candidate_name: string
  job_title: string
  department: string
  location: string
  start_date: string
  salary: string
  employment_type: string
  reporting_manager: string
  benefits: string
  notes: string
  hr_name: string
}

interface OfferFormProps {
  applicationId: string
  initialOffer: Partial<OfferData> | null
  candidateEmail: string
}

const C = { caramel: '#C4A882', dark: '#1a1a1a', bg: '#F5F0E8' }

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

export function OfferForm({ applicationId, initialOffer, candidateEmail }: OfferFormProps) {
  const router = useRouter()
  const [offer, setOffer] = useState<OfferData>({
    candidate_name:    initialOffer?.candidate_name    ?? '',
    job_title:         initialOffer?.job_title         ?? '',
    department:        initialOffer?.department        ?? '',
    location:          initialOffer?.location          ?? '',
    start_date:        initialOffer?.start_date        ?? '',
    salary:            initialOffer?.salary            ?? '',
    employment_type:   initialOffer?.employment_type   ?? 'full_time',
    reporting_manager: initialOffer?.reporting_manager ?? '',
    benefits:          initialOffer?.benefits          ?? '',
    notes:             initialOffer?.notes             ?? '',
    hr_name:           initialOffer?.hr_name           ?? '',
  })

  const [saving, setSaving]   = useState(false)
  const [sending, setSending] = useState(false)
  const [genPdf, setGenPdf]   = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [offerSent, setOfferSent] = useState(initialOffer ? (initialOffer as { status?: string }).status === 'sent' : false)

  const set = useCallback((key: keyof OfferData, value: string) => {
    setOffer(prev => ({ ...prev, [key]: value }))
    setSaveMsg(null)
  }, [])

  const offerPayload = {
    ...offer,
    salary: offer.salary ? parseFloat(offer.salary) : null,
    start_date: offer.start_date || null,
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerPayload),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaveMsg('Saved')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleGeneratePdf() {
    setGenPdf(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/offer/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer: offerPayload }),
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `offer-letter-${offer.candidate_name.replace(/\s+/g, '-').toLowerCase() || 'offer'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed')
    } finally {
      setGenPdf(false)
    }
  }

  async function handleSendToCandidate() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/offer/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer: offerPayload }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setOfferSent(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const fmtSalary = offer.salary
    ? `$${Number(offer.salary).toLocaleString()}/yr`
    : '—'
  const fmtStart = offer.start_date
    ? new Date(offer.start_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  const fmtType = EMPLOYMENT_OPTIONS.find(o => o.value === offer.employment_type)?.label ?? '—'

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>

      {/* ── LEFT: Form ──────────────────────────────────────────────── */}
      <div className="space-y-5">
        {offerSent && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-700 font-medium">Offer letter sent to {candidateEmail}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Candidate Info */}
        <FieldGroup title="Candidate">
          <Field label="Candidate Name" required>
            <input value={offer.candidate_name} onChange={e => set('candidate_name', e.target.value)}
              className={inputCls} placeholder="Jane Smith" />
          </Field>
          <Field label="HR Representative" required>
            <input value={offer.hr_name} onChange={e => set('hr_name', e.target.value)}
              className={inputCls} placeholder="Your name" />
          </Field>
        </FieldGroup>

        {/* Position Details */}
        <FieldGroup title="Position">
          <Field label="Job Title" required>
            <input value={offer.job_title} onChange={e => set('job_title', e.target.value)}
              className={inputCls} placeholder="Senior Analyst" />
          </Field>
          <Field label="Department">
            <input value={offer.department} onChange={e => set('department', e.target.value)}
              className={inputCls} placeholder="Finance" />
          </Field>
          <Field label="Location">
            <input value={offer.location} onChange={e => set('location', e.target.value)}
              className={inputCls} placeholder="New York, NY" />
          </Field>
          <Field label="Reporting Manager">
            <input value={offer.reporting_manager} onChange={e => set('reporting_manager', e.target.value)}
              className={inputCls} placeholder="John Doe" />
          </Field>
        </FieldGroup>

        {/* Compensation */}
        <FieldGroup title="Compensation & Terms">
          <Field label="Start Date">
            <input type="date" value={offer.start_date} onChange={e => set('start_date', e.target.value)}
              className={inputCls} />
          </Field>
          <Field label="Annual Salary (USD)">
            <input type="number" value={offer.salary} onChange={e => set('salary', e.target.value)}
              className={inputCls} placeholder="150000" min="0" step="1000" />
          </Field>
          <Field label="Employment Type">
            <select value={offer.employment_type} onChange={e => set('employment_type', e.target.value)}
              className={inputCls}>
              {EMPLOYMENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </FieldGroup>

        {/* Benefits & Notes */}
        <FieldGroup title="Benefits & Additional Terms">
          <Field label="Benefits Summary" fullWidth>
            <textarea value={offer.benefits} onChange={e => set('benefits', e.target.value)}
              className={`${inputCls} resize-y`} rows={3}
              placeholder="Health insurance, 401k match, 20 days PTO..." />
          </Field>
          <Field label="Additional Notes" fullWidth>
            <textarea value={offer.notes} onChange={e => set('notes', e.target.value)}
              className={`${inputCls} resize-y`} rows={2}
              placeholder="Any additional terms or conditions..." />
          </Field>
        </FieldGroup>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium border border-stone-200 rounded-lg text-gray-700 hover:bg-stone-50 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : saveMsg ?? 'Save Draft'}
          </button>
          <button onClick={handleGeneratePdf} disabled={genPdf}
            className="px-4 py-2 text-sm font-medium border border-stone-200 rounded-lg text-gray-700 hover:bg-stone-50 transition-colors disabled:opacity-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {genPdf ? 'Generating…' : 'Generate PDF'}
          </button>
          <button onClick={handleSendToCandidate} disabled={sending}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2 ml-auto"
            style={{ backgroundColor: sending ? '#d0c0a0' : C.caramel }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {sending ? 'Sending…' : 'Send to Candidate'}
          </button>
        </div>
      </div>

      {/* ── RIGHT: Live Preview ──────────────────────────────────────── */}
      <div className="sticky top-6">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between"
            style={{ background: 'linear-gradient(to right, #fdf9f4, #fff)' }}>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Live Preview</h3>
            <span className="text-xs text-stone-300">PDF will match this layout</span>
          </div>

          {/* Offer letter preview */}
          <div className="p-7 text-sm" style={{ fontFamily: 'Georgia, serif', lineHeight: 1.7 }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-5 border-b-2" style={{ borderColor: C.caramel }}>
              <div>
                <p className="font-bold text-lg tracking-wide" style={{ color: C.dark, fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>
                  EXXIR CAPITAL
                </p>
                <p className="text-xs tracking-widest mt-0.5" style={{ color: C.caramel, fontFamily: 'sans-serif' }}>
                  OFFER OF EMPLOYMENT
                </p>
              </div>
              <p className="text-xs text-gray-400" style={{ fontFamily: 'sans-serif' }}>
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <p className="font-semibold text-gray-900 mb-0.5">{offer.candidate_name || 'Candidate Name'}</p>
            {offer.job_title && (
              <p className="text-gray-500 text-xs mb-4" style={{ fontFamily: 'sans-serif' }}>
                Re: Offer of Employment — {offer.job_title}
              </p>
            )}

            <p className="text-gray-700 mb-4">
              Dear {offer.candidate_name || '[Candidate Name]'},
            </p>
            <p className="text-gray-700 mb-5">
              We are pleased to extend this offer of employment to you for the position of{' '}
              <strong>{offer.job_title || '[Job Title]'}</strong>
              {offer.department ? ` in the ${offer.department} department` : ''}
              {offer.location ? `, based in ${offer.location}` : ''}.
            </p>

            {/* Details table */}
            <div className="rounded-lg overflow-hidden mb-5" style={{ backgroundColor: '#faf6ef' }}>
              <div className="px-4 py-2 border-b border-stone-100" style={{ backgroundColor: '#f5f0e8' }}>
                <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase" style={{ fontFamily: 'sans-serif' }}>
                  Employment Details
                </p>
              </div>
              <div className="px-4 py-3 space-y-2">
                {[
                  ['Position', offer.job_title],
                  offer.department && ['Department', offer.department],
                  offer.location && ['Location', offer.location],
                  ['Start Date', fmtStart],
                  ['Compensation', fmtSalary],
                  ['Employment Type', fmtType],
                  offer.reporting_manager && ['Reporting To', offer.reporting_manager],
                ].filter(Boolean).map(([label, value]) => (
                  <div key={String(label)} className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-stone-400 w-32 flex-shrink-0" style={{ fontFamily: 'sans-serif' }}>
                      {label}
                    </span>
                    <span className="text-gray-700 text-xs">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {offer.benefits && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5" style={{ fontFamily: 'sans-serif' }}>
                  Benefits
                </p>
                <p className="text-gray-700 text-xs whitespace-pre-wrap">{offer.benefits}</p>
              </div>
            )}

            {offer.notes && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1.5" style={{ fontFamily: 'sans-serif' }}>
                  Additional Notes
                </p>
                <p className="text-gray-700 text-xs whitespace-pre-wrap">{offer.notes}</p>
              </div>
            )}

            <p className="text-gray-700 mb-5 text-xs">
              We look forward to welcoming you to the Exxir Capital team.
              Please sign and return this letter to confirm your acceptance.
            </p>

            <div className="flex justify-between pt-4 border-t border-stone-100">
              <div>
                <div className="w-36 border-b border-stone-300 mb-1.5" />
                <p className="text-xs font-semibold text-gray-700">{offer.hr_name || 'HR Representative'}</p>
                <p className="text-xs text-gray-400">Exxir Capital</p>
              </div>
              <div className="text-right">
                <div className="w-36 border-b border-stone-300 mb-1.5" />
                <p className="text-xs text-gray-400">Candidate Signature & Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputCls = 'w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300'

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-stone-100" style={{ backgroundColor: '#faf6ef' }}>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{title}</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, required, fullWidth }: { label: string; children: React.ReactNode; required?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
