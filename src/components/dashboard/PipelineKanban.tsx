'use client'

import Link from 'next/link'
import { useState } from 'next/navigation'
import { getStatusColor, getPipelineStage, getStatusLabel } from '@/lib/utils/formatting'

interface KanbanApp {
  id: string
  applicant_name: string
  applicant_email: string
  status: string
  submitted_at: string
  ai_screening?: { score: number; recommendation: string } | null
}

interface Props {
  applications: KanbanApp[]
  jobId: string
}

const STAGES = [
  { key: 'new',              label: 'New',            color: '#6B7280', bg: '#F3F4F6' },
  { key: 'first_interview',  label: '1st Interview',  color: '#D97706', bg: '#FFFBEB' },
  { key: 'second_interview', label: '2nd Interview',  color: '#EA580C', bg: '#FFF7ED' },
  { key: 'offer',            label: 'Offer',          color: '#C4A882', bg: '#FDF6EC' },
  { key: 'rejected',         label: 'Rejected',       color: '#DC2626', bg: '#FEF2F2' },
  { key: 'hired',            label: 'Hired',          color: '#16A34A', bg: '#F0FDF4' },
]

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 75 ? 'text-green-700 bg-green-100'
            : score >= 50 ? 'text-amber-700 bg-amber-100'
            : 'text-red-700 bg-red-100'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${cls}`}>
      {score}
    </span>
  )
}

export function PipelineKanban({ applications }: Props) {
  const grouped: Record<string, KanbanApp[]> = {}
  for (const stage of STAGES) grouped[stage.key] = []
  for (const app of applications) {
    const stage = getPipelineStage(app.status)
    if (grouped[stage]) grouped[stage].push(app)
    else grouped['new'].push(app)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '420px' }}>
      {STAGES.map(stage => {
        const cards = grouped[stage.key] ?? []
        return (
          <div key={stage.key} className="flex-shrink-0 w-56">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
              </div>
              <span className="text-xs text-stone-400 bg-stone-100 rounded-full px-2 py-0.5 font-medium">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {cards.map(app => (
                <Link
                  key={app.id}
                  href={`/dashboard/candidates/${app.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-3.5 hover:shadow-md hover:border-stone-300 transition-all group"
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-700 font-semibold text-xs">
                        {app.applicant_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
                        {app.applicant_name}
                      </p>
                    </div>
                  </div>

                  {/* Score + status */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    {app.ai_screening ? (
                      <ScoreBadge score={app.ai_screening.score} />
                    ) : (
                      <span className="text-xs text-stone-300 italic">
                        {app.status === 'screening' ? 'Screening…' : 'No score'}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getStatusColor(app.status)}`}>
                      {getStatusLabel(app.status)}
                    </span>
                  </div>
                </Link>
              ))}

              {cards.length === 0 && (
                <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center">
                  <p className="text-xs text-stone-300">None</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
