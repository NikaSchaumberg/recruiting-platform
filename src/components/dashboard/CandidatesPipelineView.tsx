'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate, getScoreColor } from '@/lib/utils/formatting'

interface AppRow {
  id: string
  applicant_name: string
  applicant_email: string
  status: string
  submitted_at: string
  ai_screening?: { score: number; recommendation: string } | null
}

interface Props {
  applications: AppRow[]
  jobId: string
  jobStatus: string
}

// Maps DB statuses → tab key
function toTab(status: string): string {
  switch (status) {
    case 'pending':
    case 'screening':
    case 'screened':
    case 'shortlisted':
      return 'new'
    case 'interview_invited':
    case 'first_interview':
      return 'first_interview'
    case 'interview':
    case 'second_interview':
      return 'second_interview'
    case 'offer':
      return 'offer'
    case 'rejected':
      return 'rejected'
    case 'hired':
      return 'hired'
    default:
      return 'new'
  }
}

const TABS = [
  { key: 'new',              label: 'New' },
  { key: 'first_interview',  label: '1st Interview' },
  { key: 'second_interview', label: '2nd Interview' },
  { key: 'offer',            label: 'Offer' },
  { key: 'rejected',         label: 'Rejected' },
  { key: 'hired',            label: 'Hired' },
]

// Status options available in the stage dropdown on a card
const STAGE_OPTIONS = [
  { value: 'pending',          label: 'New' },
  { value: 'first_interview',  label: '1st Interview' },
  { value: 'second_interview', label: '2nd Interview' },
  { value: 'offer',            label: 'Offer' },
  { value: 'rejected',         label: 'Rejected' },
  { value: 'hired',            label: 'Hired' },
]

export function CandidatesPipelineView({ applications: initial, jobId, jobStatus }: Props) {
  const [apps, setApps] = useState(initial)
  const [activeTab, setActiveTab] = useState('new')
  const [movingId, setMovingId] = useState<string | null>(null)

  // Per-tab counts (for stats + tab badges), ignoring rejected in stats
  const counts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = apps.filter(a => toTab(a.status) === t.key).length
    return acc
  }, {})

  async function moveStage(appId: string, newStatus: string) {
    // Optimistic update
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
    setMovingId(appId)
    try {
      await fetch(`/api/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      // revert on failure
      setApps(initial)
    } finally {
      setMovingId(null)
    }
  }

  const visibleApps = apps.filter(a => toTab(a.status) === activeTab)

  const STAT_CARDS = [
    { label: 'New Applicants',  key: 'new',              color: 'text-gray-700' },
    { label: '1st Interview',   key: 'first_interview',  color: 'text-amber-600' },
    { label: '2nd Interview',   key: 'second_interview', color: 'text-orange-600' },
    { label: 'Offer',           key: 'offer',            color: 'text-brand-600' },
    { label: 'Hired',           key: 'hired',            color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-5">
      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STAT_CARDS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            className="bg-white rounded-xl border p-4 shadow-sm text-left transition-all"
            style={{ borderColor: activeTab === s.key ? '#C4A882' : '#e7e5e4' }}
          >
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1.5">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{counts[s.key]}</p>
          </button>
        ))}
      </div>

      {/* ── Tab panel ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">

        {/* Tab bar */}
        <div className="border-b border-stone-100 flex items-center justify-between px-4 gap-2" style={{ backgroundColor: '#fdfaf6' }}>
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors"
                style={
                  activeTab === tab.key
                    ? { borderColor: '#C4A882', color: '#1a1a1a' }
                    : { borderColor: 'transparent', color: '#78716c' }
                }
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-xs font-bold"
                    style={
                      activeTab === tab.key
                        ? { backgroundColor: '#C4A882', color: '#fff' }
                        : { backgroundColor: '#e7e5e4', color: '#78716c' }
                    }
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {jobStatus === 'open' && (
            <Link
              href={`/careers/${jobId}/apply`}
              target="_blank"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 flex-shrink-0 ml-2"
            >
              Apply link
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
        </div>

        {/* Candidate grid */}
        {visibleApps.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-stone-400">No candidates in this stage.</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleApps
              .sort((a, b) => (b.ai_screening?.score ?? -1) - (a.ai_screening?.score ?? -1))
              .map(app => (
                <CandidateCard
                  key={app.id}
                  app={app}
                  moving={movingId === app.id}
                  onMove={moveStage}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Candidate Card ─────────────────────────────────────────────────────────────

function CandidateCard({
  app,
  moving,
  onMove,
}: {
  app: AppRow
  moving: boolean
  onMove: (id: string, status: string) => void
}) {
  const initials = app.applicant_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const currentStageOption = STAGE_OPTIONS.find(o => toTab(app.status) === toTab(o.value)) ?? STAGE_OPTIONS[0]

  return (
    <Link
      href={`/dashboard/candidates/${app.id}`}
      className="block bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md hover:border-stone-300 transition-all group"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-700 font-semibold text-sm">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
            {app.applicant_name}
          </p>
          <p className="text-xs text-stone-400 truncate">{app.applicant_email}</p>
        </div>
      </div>

      {/* Score + date */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {app.ai_screening ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getScoreColor(app.ai_screening.score)}`}>
            {app.ai_screening.score}/100
          </span>
        ) : (
          <span className="text-xs text-stone-300 italic">
            {app.status === 'screening' ? 'Screening…' : 'No score'}
          </span>
        )}
        <span className="text-xs text-stone-400">{formatDate(app.submitted_at)}</span>
      </div>

      {/* Stage selector — stop propagation so clicking doesn't navigate */}
      <div onClick={e => e.preventDefault()}>
        <select
          value={currentStageOption.value}
          onChange={e => onMove(app.id, e.target.value)}
          disabled={moving}
          className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 text-gray-600 bg-stone-50 focus:outline-none disabled:opacity-50 cursor-pointer"
        >
          {STAGE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </Link>
  )
}
