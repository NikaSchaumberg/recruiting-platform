'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import type { Job } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PersonalInfo {
  firstName: string; lastName: string; email: string; phone: string
  address: string; city: string; state: string; zip: string; dateOfBirth: string
}

interface WorkEntry {
  employer: string; jobTitle: string; tasks: string; phone: string; address: string
  city: string; state: string; startDate: string; endDate: string; mayContact: boolean
}

interface EduEntry {
  school: string; country: string; degree: string; major: string; graduationDate: string
}

interface RefEntry {
  fullName: string; relationship: string; company: string; phone: string; email: string
}

interface ExtractedData {
  firstName?: string; lastName?: string; email?: string; phone?: string
  address?: string; city?: string; state?: string; zip?: string; dateOfBirth?: string
  skills?: string[]
  workExperience?: Array<{
    employer?: string; jobTitle?: string; tasks?: string; phone?: string; address?: string
    city?: string; state?: string; startDate?: string; endDate?: string; mayContact?: boolean
  }>
  education?: Array<{
    school?: string; country?: string; degree?: string; major?: string; graduationDate?: string
  }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const emptyWork = (): WorkEntry => ({
  employer: '', jobTitle: '', tasks: '', phone: '', address: '',
  city: '', state: '', startDate: '', endDate: '', mayContact: true,
})

const emptyEdu = (): EduEntry => ({
  school: '', country: '', degree: '', major: '', graduationDate: '',
})

const emptyRef = (): RefEntry => ({
  fullName: '', relationship: '', company: '', phone: '', email: '',
})

// ── Countries ──────────────────────────────────────────────────────────────────

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain',
  'Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros',
  'Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark',
  'Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador',
  'Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji',
  'Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece',
  'Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras',
  'Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho',
  'Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar',
  'Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands',
  'Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia',
  'Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria',
  'North Korea','North Macedonia','Norway','Oman','Pakistan','Palau',
  'Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines',
  'Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Saudi Arabia','Senegal','Serbia','Seychelles',
  'Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands',
  'Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka',
  'Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan',
  'Tanzania','Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia',
  'Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu',
  'Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
]

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: '#F5F0E8',
  card: '#FFFFFF',
  border: '#E8E2D8',
  caramel: '#C4A882',
  caramelDark: '#A8845E',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A09890',
}

const INPUT: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', fontSize: '15px',
  border: `1px solid ${C.border}`, borderRadius: '6px',
  backgroundColor: C.card, color: C.text,
  fontFamily: 'inherit', outline: 'none',
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 600,
  color: C.text, marginBottom: '6px',
}

const STEP_LABELS = [
  'CV / Resume Upload', 'Personal Info', 'Skills',
  'Work Experience', 'Education', 'References', 'Review & Submit',
]

// ── Module-level Field component ──────────────────────────────────────────────

function Field({
  label, fieldKey, value, onChange, type = 'text', placeholder, required, autoFillSet,
}: {
  label: string; fieldKey?: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; autoFillSet?: Set<string>
}) {
  const af = fieldKey ? autoFillSet?.has(fieldKey) : false
  return (
    <div>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: C.caramel }}> *</span>}
        {af && (
          <span style={{ fontSize: '11px', color: C.caramel, fontWeight: 500, marginLeft: '8px' }}>
            Auto-filled ✓
          </span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...INPUT,
          borderColor: af ? '#C4A88255' : C.border,
          backgroundColor: af ? '#FDFAF6' : C.card,
        }}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ApplicationWizard({ job }: { job: Job }) {
  const [step, setStep] = useState(1)

  // Step 1 — CV
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseDone, setParseDone] = useState(false)
  const cvRef = useRef<HTMLInputElement>(null)

  // Step 2 — Personal
  const [personal, setPersonal] = useState<PersonalInfo>({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', dateOfBirth: '',
  })
  const [personalAF, setPersonalAF] = useState<Set<string>>(new Set())

  // Step 3 — Skills
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')

  // Step 4 — Work
  const [workExp, setWorkExp] = useState<WorkEntry[]>([emptyWork()])

  // Step 5 — Education
  const [education, setEducation] = useState<EduEntry[]>([emptyEdu()])

  // Step 6 — References
  const [references, setReferences] = useState<RefEntry[]>([emptyRef(), emptyRef(), emptyRef()])

  // Step 7 — Submit
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const clRef = useRef<HTMLInputElement>(null)

  // ── CV parsing ──────────────────────────────────────────────────────────────

  function acceptCV(file: File) {
    if (file.type !== 'application/pdf') { setParseError('Please upload a PDF file.'); return }
    if (file.size > 10 * 1024 * 1024) { setParseError('File must be under 10MB.'); return }
    setParseError(null); setParseDone(false); setCvFile(file)
  }

  async function analyzeCV() {
    if (!cvFile) return
    setParsing(true); setParseError(null)
    try {
      const fd = new FormData()
      fd.append('cv', cvFile)
      const res = await fetch('/api/applications/parse-cv', { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Analysis failed')

      const d = body.data as ExtractedData
      const af = new Set<string>()
      const p = { ...personal }

      function fill(k: keyof PersonalInfo, v?: string) {
        if (v?.trim()) { p[k] = v.trim(); af.add(k) }
      }

      fill('firstName', d.firstName); fill('lastName', d.lastName)
      fill('email', d.email); fill('phone', d.phone)
      fill('address', d.address); fill('city', d.city)
      fill('state', d.state); fill('zip', d.zip)
      fill('dateOfBirth', d.dateOfBirth)

      setPersonal(p); setPersonalAF(af)

      if (d.skills?.length) setSkills(d.skills)

      if (d.workExperience?.length) {
        setWorkExp(d.workExperience.map(w => ({
          employer: w.employer ?? '', jobTitle: w.jobTitle ?? '',
          tasks: w.tasks ?? '',
          phone: w.phone ?? '', address: w.address ?? '',
          city: w.city ?? '', state: w.state ?? '',
          startDate: w.startDate ?? '', endDate: w.endDate ?? '',
          mayContact: w.mayContact !== false,
        })))
      }

      if (d.education?.length) {
        setEducation(d.education.map(e => ({
          school: e.school ?? '', country: e.country ?? '',
          degree: e.degree ?? '', major: e.major ?? '',
          graduationDate: e.graduationDate ?? '',
        })))
      }

      setParseDone(true)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  // ── Skill helpers ───────────────────────────────────────────────────────────

  function addSkill(raw: string) {
    const s = raw.trim()
    if (s && !skills.includes(s)) setSkills(p => [...p, s])
    setSkillInput('')
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!cvFile || !confirmed) return
    setSubmitting(true)
    try {
      const applicationData = {
        personal, skills,
        workExperience: workExp,
        education,
        references,
        coverLetterFilename: coverLetterFile?.name ?? null,
      }
      const fd = new FormData()
      fd.append('job_id', job.id)
      fd.append('applicant_name', `${personal.firstName} ${personal.lastName}`.trim() || 'Applicant')
      fd.append('applicant_email', personal.email)
      if (personal.phone) fd.append('phone', personal.phone)
      fd.append('cv', cvFile)
      fd.append('application_data', JSON.stringify(applicationData))
      if (coverLetterFile) fd.append('cover_letter_file', coverLetterFile)

      const res = await fetch('/api/applications', { method: 'POST', body: fd })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Submission failed')
      setSubmitted(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#EAF2EA', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A8A4A" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <h2 className="font-serif-display" style={{ fontSize: '30px', color: C.text, marginBottom: '12px' }}>
            Application Submitted!
          </h2>
          <p style={{ fontSize: '16px', color: C.muted, lineHeight: 1.7, marginBottom: '32px' }}>
            Thank you for applying to <strong>{job.title}</strong>. Our team will review your application and get back to you within a week.
          </p>
          <Link href="/careers" style={{
            display: 'inline-block', padding: '12px 28px',
            backgroundColor: C.caramel, color: '#FFFFFF',
            borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '15px',
          }}>
            View other positions
          </Link>
        </div>
      </div>
    )
  }

  // ── Progress bar ────────────────────────────────────────────────────────────

  function renderProgress() {
    const pct = Math.round(((step - 1) / (STEP_LABELS.length - 1)) * 100)
    return (
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: C.caramel }}>
            Step {step} of {STEP_LABELS.length}
          </span>
          <span style={{ fontSize: '13px', color: C.muted }}>{STEP_LABELS[step - 1]}</span>
        </div>
        <div style={{ height: '3px', backgroundColor: C.border, borderRadius: '2px' }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            backgroundColor: C.caramel,
            width: `${pct}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {STEP_LABELS.map((_, i) => {
            const n = i + 1
            const done = n < step; const active = n === step
            return (
              <div key={n} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: done || active ? C.caramel : C.border,
              }} />
            )
          })}
        </div>
      </div>
    )
  }

  // ── Nav buttons ─────────────────────────────────────────────────────────────

  function renderNav(nextDisabled = false, nextLabel = 'Continue →', onNext?: () => void) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '36px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
        {step > 1 ? (
          <button type="button" onClick={() => setStep(s => s - 1)} style={{
            padding: '10px 24px', fontSize: '14px', fontWeight: 600,
            border: `1px solid ${C.border}`, borderRadius: '6px',
            backgroundColor: 'transparent', color: C.muted, cursor: 'pointer',
          }}>
            ← Back
          </button>
        ) : <div />}
        <button type="button" onClick={onNext ?? (() => setStep(s => s + 1))} disabled={nextDisabled} style={{
          padding: '10px 28px', fontSize: '14px', fontWeight: 600,
          backgroundColor: nextDisabled ? C.border : C.caramel,
          color: nextDisabled ? C.faint : '#FFFFFF',
          border: 'none', borderRadius: '6px',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
        }}>
          {nextLabel}
        </button>
      </div>
    )
  }

  // ── Step 1: CV Upload ───────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>
          Upload your CV / Resume to get started
        </h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          We&apos;ll use AI to automatically fill in your information. PDF only, max 10MB.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => !cvFile && cvRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) acceptCV(f) }}
          style={{
            border: `2px dashed ${isDragging ? C.caramel : cvFile ? C.caramel : C.border}`,
            borderRadius: '12px', padding: '52px 32px', textAlign: 'center',
            backgroundColor: isDragging ? '#FDF8F2' : cvFile ? '#FDFAF6' : C.card,
            cursor: cvFile ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {cvFile ? (
            <div>
              <div style={{
                width: '52px', height: '52px', borderRadius: '10px',
                backgroundColor: '#F0EBE3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.caramel} strokeWidth="1.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <p style={{ fontWeight: 600, color: C.text, fontSize: '15px', marginBottom: '4px' }}>{cvFile.name}</p>
              <p style={{ fontSize: '13px', color: C.muted, marginBottom: '16px' }}>
                {(cvFile.size / 1024).toFixed(0)} KB
              </p>
              <button type="button" onClick={e => { e.stopPropagation(); setCvFile(null); setParseDone(false); setParseError(null) }}
                style={{ fontSize: '13px', color: '#B45050', background: 'none', border: 'none', cursor: 'pointer' }}>
                Remove file
              </button>
            </div>
          ) : (
            <div>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.faint} strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 18px', display: 'block' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ fontSize: '17px', fontWeight: 600, color: C.text, marginBottom: '8px' }}>
                Drag and drop your CV / Resume here
              </p>
              <p style={{ fontSize: '14px', color: C.muted, marginBottom: '4px' }}>
                or <span style={{ color: C.caramel, fontWeight: 600 }}>click to browse</span>
              </p>
              <p style={{ fontSize: '12px', color: C.faint }}>PDF only · Max 10MB</p>
            </div>
          )}
        </div>
        <input ref={cvRef} type="file" accept="application/pdf" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) acceptCV(f) }} />

        {parseError && (
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#B45050' }}>{parseError}</p>
        )}

        {/* Analyze button */}
        {cvFile && !parseDone && !parsing && (
          <button type="button" onClick={analyzeCV} style={{
            marginTop: '24px', width: '100%', padding: '14px',
            backgroundColor: C.caramel, color: '#FFFFFF',
            border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          }}>
            Upload
          </button>
        )}

        {/* Loading */}
        {parsing && (
          <>
            <style>{`@keyframes _spin { to { transform: rotate(360deg) } }`}</style>
            <div style={{ marginTop: '28px', textAlign: 'center' }}>
              <div style={{
                width: '32px', height: '32px',
                border: `3px solid ${C.border}`, borderTopColor: C.caramel, borderRadius: '50%',
                animation: '_spin 0.8s linear infinite',
                margin: '0 auto 14px',
              }} />
              <p style={{ fontSize: '15px', color: C.muted }}>Resume is uploading...</p>
            </div>
          </>
        )}

        {/* Success */}
        {parseDone && (
          <div style={{
            marginTop: '24px', padding: '16px 20px',
            backgroundColor: '#F0F7F0', border: '1px solid #B8D8B8', borderRadius: '8px',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#3A6B3A', marginBottom: '4px' }}>
              ✓ We found your information! Please review below.
            </p>
            <p style={{ fontSize: '13px', color: '#5A8B5A' }}>
              Extracted fields are highlighted in your form. You can edit anything before submitting.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '36px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
          <div />
          <button type="button" onClick={() => setStep(2)} disabled={!cvFile} style={{
            padding: '10px 28px', fontSize: '14px', fontWeight: 600,
            backgroundColor: !cvFile ? C.border : C.caramel,
            color: !cvFile ? C.faint : '#FFFFFF',
            border: 'none', borderRadius: '6px', cursor: !cvFile ? 'not-allowed' : 'pointer',
          }}>
            Continue →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Personal Info ───────────────────────────────────────────────────

  function renderStep2() {
    const af = personalAF
    const p = personal
    const set = (k: keyof PersonalInfo) => (v: string) => setPersonal(prev => ({ ...prev, [k]: v }))

    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>Personal Information</h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          Review and complete your details. Fields marked <span style={{ color: C.caramel, fontWeight: 600 }}>Auto-filled ✓</span> were extracted from your CV / Resume.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="First Name" fieldKey="firstName" value={p.firstName} onChange={set('firstName')} required autoFillSet={af} placeholder="Jane" />
            <Field label="Last Name" fieldKey="lastName" value={p.lastName} onChange={set('lastName')} required autoFillSet={af} placeholder="Smith" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Email Address" fieldKey="email" value={p.email} onChange={set('email')} type="email" required autoFillSet={af} placeholder="jane@example.com" />
            <Field label="Phone Number" fieldKey="phone" value={p.phone} onChange={set('phone')} type="tel" autoFillSet={af} placeholder="+1 555 000 0000" />
          </div>
          <Field label="Street Address" fieldKey="address" value={p.address} onChange={set('address')} autoFillSet={af} placeholder="123 Main St" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="City" fieldKey="city" value={p.city} onChange={set('city')} autoFillSet={af} placeholder="Dallas" />
            <Field label="State / Province" fieldKey="state" value={p.state} onChange={set('state')} autoFillSet={af} placeholder="TX" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="ZIP / Postal Code" fieldKey="zip" value={p.zip} onChange={set('zip')} autoFillSet={af} placeholder="75001" />
            <Field label="Date of Birth" fieldKey="dateOfBirth" value={p.dateOfBirth} onChange={set('dateOfBirth')} type="date" autoFillSet={af} />
          </div>
        </div>
        {renderNav(!p.firstName.trim() || !p.email.trim())}
      </div>
    )
  }

  // ── Step 3: Skills ──────────────────────────────────────────────────────────

  function renderStep3() {
    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>Skills</h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          Review skills extracted from your CV / Resume. Add more by typing and pressing Enter.
        </p>
        <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '24px' }}>
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {skills.map(skill => (
                <div key={skill} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '20px',
                  backgroundColor: '#FDF8F2', border: `1px solid ${C.caramel}40`,
                  fontSize: '13px', fontWeight: 500, color: C.text,
                }}>
                  {skill}
                  <button type="button" onClick={() => setSkills(p => p.filter(s => s !== skill))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: '16px', lineHeight: 1, padding: 0, marginLeft: '2px' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput) } }}
              placeholder="Type a skill and press Enter..."
              style={{ ...INPUT, flex: 1 }}
            />
            <button type="button" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} style={{
              padding: '10px 18px', backgroundColor: C.caramel, color: '#FFFFFF',
              border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
            }}>
              Add
            </button>
          </div>
        </div>
        {renderNav()}
      </div>
    )
  }

  // ── Step 4: Work Experience ─────────────────────────────────────────────────

  function renderStep4() {
    function updateWork(i: number, k: keyof WorkEntry, v: string | boolean) {
      setWorkExp(prev => prev.map((w, idx) => idx === i ? { ...w, [k]: v } : w))
    }

    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>Work Experience</h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          Review your work history extracted from your CV / Resume. Edit or add employers as needed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {workExp.map((w, i) => (
            <div key={i} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.caramel }}>
                  Employer {i + 1}
                </p>
                {workExp.length > 1 && (
                  <button type="button" onClick={() => setWorkExp(p => p.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#B45050' }}>
                    Remove
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>Employer</label><input value={w.employer} onChange={e => updateWork(i, 'employer', e.target.value)} style={INPUT} placeholder="Company name" /></div>
                  <div><label style={LABEL}>Job Title</label><input value={w.jobTitle} onChange={e => updateWork(i, 'jobTitle', e.target.value)} style={INPUT} placeholder="Your position" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>Phone</label><input value={w.phone} onChange={e => updateWork(i, 'phone', e.target.value)} style={INPUT} placeholder="+1 555 000 0000" /></div>
                  <div><label style={LABEL}>Address</label><input value={w.address} onChange={e => updateWork(i, 'address', e.target.value)} style={INPUT} placeholder="Street address" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>City</label><input value={w.city} onChange={e => updateWork(i, 'city', e.target.value)} style={INPUT} placeholder="City" /></div>
                  <div><label style={LABEL}>State / Country</label><input value={w.state} onChange={e => updateWork(i, 'state', e.target.value)} style={INPUT} placeholder="TX / United States" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>Start Date</label><input value={w.startDate} onChange={e => updateWork(i, 'startDate', e.target.value)} style={INPUT} placeholder="MM/YYYY" /></div>
                  <div><label style={LABEL}>End Date</label><input value={w.endDate} onChange={e => updateWork(i, 'endDate', e.target.value)} style={INPUT} placeholder="MM/YYYY or Present" /></div>
                </div>
                <div>
                  <label style={LABEL}>Job Tasks &amp; Responsibilities</label>
                  <textarea
                    value={w.tasks}
                    onChange={e => updateWork(i, 'tasks', e.target.value)}
                    placeholder="Describe your main responsibilities and achievements in this role..."
                    rows={3}
                    style={{
                      ...INPUT,
                      resize: 'vertical',
                      minHeight: '80px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                    }}
                  />
                </div>
                <div>
                  <label style={LABEL}>May we contact this employer?</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['Yes', 'No'] as const).map(opt => {
                      const sel = (opt === 'Yes') === w.mayContact
                      return (
                        <button key={opt} type="button" onClick={() => updateWork(i, 'mayContact', opt === 'Yes')} style={{
                          padding: '8px 22px', fontSize: '14px', fontWeight: 600, borderRadius: '6px',
                          border: `1.5px solid ${sel ? C.caramel : C.border}`,
                          backgroundColor: sel ? '#FDF8F2' : 'transparent',
                          color: sel ? C.caramelDark : C.muted, cursor: 'pointer',
                        }}>{opt}</button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setWorkExp(p => [...p, emptyWork()])} style={{
          marginTop: '12px', width: '100%', padding: '12px',
          border: `1.5px dashed ${C.border}`, borderRadius: '8px',
          backgroundColor: 'transparent', color: C.muted, fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>
          + Add Another Employer
        </button>
        {renderNav()}
      </div>
    )
  }

  // ── Step 5: Education ───────────────────────────────────────────────────────

  function renderStep5() {
    function updateEdu(i: number, k: keyof EduEntry, v: string) {
      setEducation(prev => prev.map((e, idx) => idx === i ? { ...e, [k]: v } : e))
    }

    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>Education</h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          Review your education history extracted from your CV / Resume.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {education.map((e, i) => (
            <div key={i} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.caramel }}>
                  School {i + 1}
                </p>
                {education.length > 1 && (
                  <button type="button" onClick={() => setEducation(p => p.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#B45050' }}>
                    Remove
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>School Name</label><input value={e.school} onChange={ev => updateEdu(i, 'school', ev.target.value)} style={INPUT} placeholder="University name" /></div>
                  <div>
                    <label style={LABEL}>Country</label>
                    <select value={e.country} onChange={ev => updateEdu(i, 'country', ev.target.value)}
                      style={{ ...INPUT, appearance: 'auto' as React.CSSProperties['appearance'] }}>
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>Degree</label><input value={e.degree} onChange={ev => updateEdu(i, 'degree', ev.target.value)} style={INPUT} placeholder="e.g. Bachelor of Science" /></div>
                  <div><label style={LABEL}>Major / Field of Study</label><input value={e.major} onChange={ev => updateEdu(i, 'major', ev.target.value)} style={INPUT} placeholder="e.g. Computer Science" /></div>
                </div>
                <div style={{ maxWidth: '240px' }}>
                  <label style={LABEL}>Graduation Date</label>
                  <input value={e.graduationDate} onChange={ev => updateEdu(i, 'graduationDate', ev.target.value)} style={INPUT} placeholder="MM/YYYY" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setEducation(p => [...p, emptyEdu()])} style={{
          marginTop: '12px', width: '100%', padding: '12px',
          border: `1.5px dashed ${C.border}`, borderRadius: '8px',
          backgroundColor: 'transparent', color: C.muted, fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>
          + Add Another School
        </button>
        {renderNav()}
      </div>
    )
  }

  // ── Step 6: References ──────────────────────────────────────────────────────

  function renderStep6() {
    function updateRef(i: number, k: keyof RefEntry, v: string) {
      setReferences(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
    }

    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>References</h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          Please provide up to three professional references.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {references.map((r, i) => (
            <div key={i} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '24px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.caramel, marginBottom: '20px' }}>
                Reference {i + 1}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>Full Name</label><input value={r.fullName} onChange={e => updateRef(i, 'fullName', e.target.value)} style={INPUT} placeholder="John Doe" /></div>
                  <div><label style={LABEL}>Relationship</label><input value={r.relationship} onChange={e => updateRef(i, 'relationship', e.target.value)} style={INPUT} placeholder="e.g. Former Manager" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div><label style={LABEL}>Company</label><input value={r.company} onChange={e => updateRef(i, 'company', e.target.value)} style={INPUT} placeholder="Company name" /></div>
                  <div><label style={LABEL}>Phone</label><input value={r.phone} onChange={e => updateRef(i, 'phone', e.target.value)} style={INPUT} placeholder="+1 555 000 0000" /></div>
                </div>
                <div style={{ maxWidth: '360px' }}>
                  <label style={LABEL}>Email</label>
                  <input type="email" value={r.email} onChange={e => updateRef(i, 'email', e.target.value)} style={INPUT} placeholder="john@company.com" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderNav()}
      </div>
    )
  }

  // ── Step 7: Review & Submit ─────────────────────────────────────────────────

  function renderStep7() {
    const fullName = `${personal.firstName} ${personal.lastName}`.trim()
    const filledWork = workExp.filter(w => w.employer)
    const filledEdu = education.filter(e => e.school)

    return (
      <div>
        <h2 className="font-serif-display" style={{ fontSize: '28px', color: C.text, marginBottom: '8px' }}>Review & Submit</h2>
        <p style={{ fontSize: '15px', color: C.muted, marginBottom: '32px' }}>
          Please review your information before submitting your application.
        </p>

        {/* Personal */}
        <ReviewSection title="Personal Information">
          <ReviewRow label="Name" value={fullName} />
          <ReviewRow label="Email" value={personal.email} />
          <ReviewRow label="Phone" value={personal.phone} />
          <ReviewRow label="Address" value={[personal.address, personal.city, personal.state, personal.zip].filter(Boolean).join(', ')} />
          <ReviewRow label="Date of Birth" value={personal.dateOfBirth} />
        </ReviewSection>

        {skills.length > 0 && (
          <ReviewSection title="Skills">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px' }}>
              {skills.map(s => (
                <span key={s} style={{
                  padding: '4px 10px', borderRadius: '20px',
                  backgroundColor: '#FDF8F2', border: `1px solid ${C.caramel}40`,
                  fontSize: '13px', color: C.text,
                }}>{s}</span>
              ))}
            </div>
          </ReviewSection>
        )}

        {filledWork.length > 0 && (
          <ReviewSection title="Work Experience">
            {filledWork.map((w, i) => (
              <div key={i} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: i < filledWork.length - 1 ? `1px solid #F5F0E8` : 'none' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>{w.employer}</p>
                <p style={{ fontSize: '13px', color: C.muted }}>
                  {w.jobTitle}{w.startDate ? ` · ${w.startDate}${w.endDate ? ` – ${w.endDate}` : ''}` : ''}
                </p>
                {w.tasks && (
                  <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px', lineHeight: 1.5 }}>{w.tasks}</p>
                )}
              </div>
            ))}
          </ReviewSection>
        )}

        {filledEdu.length > 0 && (
          <ReviewSection title="Education">
            {filledEdu.map((e, i) => (
              <div key={i} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: i < filledEdu.length - 1 ? `1px solid #F5F0E8` : 'none' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '2px' }}>{e.school}</p>
                <p style={{ fontSize: '13px', color: C.muted }}>
                  {[e.degree, e.major].filter(Boolean).join(' · ')}{e.graduationDate ? ` · ${e.graduationDate}` : ''}
                </p>
              </div>
            ))}
          </ReviewSection>
        )}

        {/* Cover letter upload */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.caramel, marginBottom: '12px' }}>
            Cover Letter <span style={{ fontWeight: 400, color: C.faint, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </p>
          <div onClick={() => clRef.current?.click()} style={{
            backgroundColor: C.card, border: `1.5px dashed ${C.border}`, borderRadius: '10px',
            padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.caramel} strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <span style={{ fontSize: '14px', color: coverLetterFile ? C.text : C.muted, flex: 1 }}>
              {coverLetterFile ? coverLetterFile.name : 'Upload cover letter (PDF)'}
            </span>
            {coverLetterFile && (
              <button type="button" onClick={e => { e.stopPropagation(); setCoverLetterFile(null) }}
                style={{ background: 'none', border: 'none', color: '#B45050', cursor: 'pointer', fontSize: '12px' }}>
                Remove
              </button>
            )}
          </div>
          <input ref={clRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setCoverLetterFile(f) }} />
        </div>

        {/* Confirmation */}
        <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px 24px', marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              style={{ marginTop: '2px', accentColor: C.caramel, width: '16px', height: '16px', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', color: C.muted, lineHeight: 1.65 }}>
              I confirm that all information provided is accurate and complete to the best of my knowledge. I understand that falsification of information may result in disqualification.
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
          <button type="button" onClick={() => setStep(s => s - 1)} style={{
            padding: '10px 24px', fontSize: '14px', fontWeight: 600,
            border: `1px solid ${C.border}`, borderRadius: '6px',
            backgroundColor: 'transparent', color: C.muted, cursor: 'pointer',
          }}>
            ← Back
          </button>
          <button type="button" onClick={handleSubmit} disabled={!confirmed || submitting} style={{
            padding: '12px 36px', fontSize: '15px', fontWeight: 700,
            backgroundColor: !confirmed || submitting ? C.border : C.caramel,
            color: !confirmed || submitting ? C.faint : '#FFFFFF',
            border: 'none', borderRadius: '6px',
            cursor: !confirmed || submitting ? 'not-allowed' : 'pointer',
          }}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '48px 0 100px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 28px' }}>

        {/* Back link */}
        <Link href={`/careers/${job.id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '14px', color: C.muted, textDecoration: 'none', marginBottom: '36px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Back to {job.title}
        </Link>

        {/* Job header */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.caramel, marginBottom: '8px' }}>
            {job.department}
          </p>
          <h1 className="font-serif-display" style={{ fontSize: '34px', color: C.text, marginBottom: '6px' }}>
            {job.title}
          </h1>
          <p style={{ fontSize: '14px', color: C.muted }}>{job.location}</p>
        </div>

        {/* Progress */}
        {renderProgress()}

        {/* Step content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
        {step === 7 && renderStep7()}
      </div>
    </main>
  )
}

// ── Review helpers (module-level to avoid recreation) ─────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#C4A882', marginBottom: '10px' }}>
        {title}
      </p>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E2D8', borderRadius: '10px', padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null
  return (
    <div style={{ display: 'flex', gap: '16px', padding: '7px 0', borderBottom: '1px solid #F5F0E8' }}>
      <span style={{ fontSize: '13px', color: '#78716C', minWidth: '130px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#1C1917' }}>{value}</span>
    </div>
  )
}
