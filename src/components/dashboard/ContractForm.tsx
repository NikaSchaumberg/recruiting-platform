'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ContractData {
  offer_id?: string | null
  candidate_name: string
  job_title: string
  department?: string
  location?: string
  start_date?: string | null
  salary?: number | null
  employment_type?: string
  reporting_manager?: string
  benefits?: string
  additional_terms?: string
  hr_name?: string
}

interface Props {
  applicationId: string
  initialData: ContractData
  existingContract?: (ContractData & { status?: string; sent_at?: string | null }) | null
}

const C = { caramel: '#C4A882', bg: '#faf6ef' }

export function ContractForm({ applicationId, initialData, existingContract }: Props) {
  const router = useRouter()
  const [data, setData] = useState<ContractData>(
    existingContract
      ? {
          offer_id:          existingContract.offer_id,
          candidate_name:    existingContract.candidate_name,
          job_title:         existingContract.job_title,
          department:        existingContract.department ?? '',
          location:          existingContract.location ?? '',
          start_date:        existingContract.start_date ?? '',
          salary:            existingContract.salary ?? null,
          employment_type:   existingContract.employment_type ?? '',
          reporting_manager: existingContract.reporting_manager ?? '',
          benefits:          existingContract.benefits ?? '',
          additional_terms:  existingContract.additional_terms ?? '',
          hr_name:           existingContract.hr_name ?? '',
        }
      : { ...initialData, additional_terms: '' }
  )
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [contractSent, setContractSent] = useState(
    existingContract?.status === 'sent'
  )
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof ContractData, value: string | number | null) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function saveDraft() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'draft' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function generatePdf() {
    const res = await fetch(`/api/applications/${applicationId}/contract/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract: data }),
    })
    if (!res.ok) { alert('Failed to generate PDF'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contract-${data.candidate_name.replace(/\s+/g, '-').toLowerCase()}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function sendContract() {
    if (!confirm(`Send contract PDF to ${data.candidate_name}?`)) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}/contract/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: { ...data, status: 'sent' } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setContractSent(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const cls = 'w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="space-y-6">
        {/* Candidate */}
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100" style={{ background: `linear-gradient(to right, ${C.bg}, #fff)` }}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Candidate</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Full Name">
              <input value={data.candidate_name} onChange={e => set('candidate_name', e.target.value)} className={cls} />
            </Field>
            <Field label="HR / Signatory Name">
              <input value={data.hr_name ?? ''} onChange={e => set('hr_name', e.target.value)} className={cls} placeholder="e.g. Jane Smith" />
            </Field>
          </div>
        </section>

        {/* Position */}
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100" style={{ background: `linear-gradient(to right, ${C.bg}, #fff)` }}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Position</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Job Title">
              <input value={data.job_title} onChange={e => set('job_title', e.target.value)} className={cls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department">
                <input value={data.department ?? ''} onChange={e => set('department', e.target.value)} className={cls} />
              </Field>
              <Field label="Location">
                <input value={data.location ?? ''} onChange={e => set('location', e.target.value)} className={cls} />
              </Field>
            </div>
            <Field label="Reporting Manager">
              <input value={data.reporting_manager ?? ''} onChange={e => set('reporting_manager', e.target.value)} className={cls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                <input type="date" value={data.start_date ?? ''} onChange={e => set('start_date', e.target.value)} className={cls} />
              </Field>
              <Field label="Employment Type">
                <select value={data.employment_type ?? ''} onChange={e => set('employment_type', e.target.value)} className={cls}>
                  <option value="">Select…</option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </Field>
            </div>
          </div>
        </section>

        {/* Compensation */}
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100" style={{ background: `linear-gradient(to right, ${C.bg}, #fff)` }}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Compensation</p>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Annual Salary ($)">
              <input
                type="number"
                value={data.salary ?? ''}
                onChange={e => set('salary', e.target.value ? Number(e.target.value) : null)}
                className={cls}
                placeholder="e.g. 75000"
              />
            </Field>
            <Field label="Benefits">
              <textarea
                value={data.benefits ?? ''}
                onChange={e => set('benefits', e.target.value)}
                className={`${cls} resize-y`}
                rows={3}
                placeholder="Leave blank to use standard Exxir benefits text"
              />
            </Field>
          </div>
        </section>

        {/* Additional Terms */}
        <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100" style={{ background: `linear-gradient(to right, ${C.bg}, #fff)` }}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Additional Terms</p>
          </div>
          <div className="p-5">
            <textarea
              value={data.additional_terms ?? ''}
              onChange={e => set('additional_terms', e.target.value)}
              className={`${cls} resize-y`}
              rows={5}
              placeholder="Any additional contractual terms, amendments, or special conditions…"
              style={{ fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </div>
        </section>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={generatePdf}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#374151' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate PDF
          </button>
          {!contractSent && (
            <button
              onClick={sendContract}
              disabled={sending}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: C.caramel }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {sending ? 'Sending…' : 'Send to Candidate'}
            </button>
          )}
          {contractSent && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Contract Sent
            </span>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div className="lg:sticky lg:top-6 self-start">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100" style={{ backgroundColor: C.bg }}>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Contract Preview</p>
          </div>
          <div className="p-6 font-serif text-sm leading-relaxed text-gray-800 space-y-4 max-h-[640px] overflow-y-auto">
            {/* Header */}
            <div className="border-b-2 pb-3" style={{ borderColor: C.caramel }}>
              <p className="font-bold text-base tracking-wide">EXXIR LLC</p>
              <p className="text-xs text-gray-400 mt-0.5">EMPLOYMENT AGREEMENT</p>
            </div>

            {/* Header table */}
            <table className="w-full text-xs border-collapse">
              <tbody>
                {[
                  ['Company', 'Exxir LLC'],
                  ['Employee', data.candidate_name || '—'],
                  ['Effective Date', data.start_date || '—'],
                  ['Position', data.job_title || '—'],
                  ['Reports To', data.reporting_manager || '—'],
                  ['Location', data.location || '—'],
                  ['Governing Law', 'State of Texas'],
                ].map(([label, val], i) => (
                  <tr key={label} className={i % 2 === 0 ? 'bg-stone-50' : ''}>
                    <td className="py-1 px-2 font-semibold text-stone-500 w-32">{label}</td>
                    <td className="py-1 px-2 text-gray-800">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PreviewSection title="1. Position & Duties">
              {`${data.candidate_name || '[Name]'} is hired as ${data.job_title || '[Title]'}${data.department ? ` in ${data.department}` : ''}. Full professional commitment required.`}
            </PreviewSection>

            <PreviewSection title="2. Employment Classification">
              At-will employment. Either party may terminate at any time per Section 9.
            </PreviewSection>

            <PreviewSection title="3. Compensation & Benefits">
              {`Base Salary: ${data.salary ? `$${Number(data.salary).toLocaleString()} annually` : '—'}\n` +
               `Benefits: ${data.benefits || 'Two weeks paid vacation + 5 sick days (after 90 days). BCBS Texas medical (after first full month).'}`}
            </PreviewSection>

            <PreviewSection title="4–8. IP, Confidentiality, Non-Compete, Non-Solicitation, Non-Disparagement">
              Standard Exxir LLC terms apply (12-month restrictions, DFW area).
            </PreviewSection>

            <PreviewSection title="9. Termination">
              14 days written notice required. Immediate termination for cause.
            </PreviewSection>

            <PreviewSection title="10. Dispute Resolution">
              Binding arbitration via JAMS, Dallas, TX.
            </PreviewSection>

            {data.additional_terms && (
              <PreviewSection title="Additional Terms">
                {data.additional_terms}
              </PreviewSection>
            )}

            <div className="pt-4 border-t border-stone-100">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Signatures</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-gray-700">For Exxir LLC</p>
                  <div className="border-b border-stone-300 mt-4 mb-1" />
                  <p className="text-stone-500">{data.hr_name || 'Authorized Signatory'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Employee</p>
                  <div className="border-b border-stone-300 mt-4 mb-1" />
                  <p className="text-stone-500">{data.candidate_name || '[Name]'}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-400 italic text-center pt-2">
              Jungle Fitness Studio · 200 N Bishop Ave Suite 106, Dallas, TX 75208
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  )
}
