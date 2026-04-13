'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { DeleteCandidateButton } from '@/components/dashboard/DeleteCandidateButton'
import { PipelineKanban } from '@/components/dashboard/PipelineKanban'
import { ClickableRow } from '@/components/dashboard/ClickableRow'
import {
  formatDate,
  getScoreColor,
  getStatusColor,
  getStatusLabel,
  getRecommendationLabel,
  getRecommendationColor,
} from '@/lib/utils/formatting'

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

export function CandidatesPipelineView({ applications, jobId, jobStatus }: Props) {
  const [view, setView] = useState<'list' | 'pipeline'>('list')

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between" style={{ backgroundColor: '#fdfaf6' }}>
        <h2 className="text-sm font-semibold text-gray-800">Applications</h2>
        <div className="flex items-center gap-3">
          {jobStatus === 'open' && (
            <Link
              href={`/careers/${jobId}/apply`}
              target="_blank"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              Public apply link
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          )}
          {/* View toggle */}
          <div className="flex rounded-lg border border-stone-200 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={view === 'list'
                ? { backgroundColor: '#1a1a1a', color: '#fff' }
                : { backgroundColor: 'transparent', color: '#78716C' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
            <button
              onClick={() => setView('pipeline')}
              className="px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5"
              style={view === 'pipeline'
                ? { backgroundColor: '#1a1a1a', color: '#fff' }
                : { backgroundColor: 'transparent', color: '#78716C' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Pipeline
            </button>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">No applications yet.</p>
        </div>
      ) : view === 'pipeline' ? (
        <div className="p-5">
          <PipelineKanban applications={applications} jobId={jobId} />
        </div>
      ) : (
        <table className="min-w-full divide-y divide-stone-100">
          <thead style={{ backgroundColor: '#faf6ef' }}>
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Candidate</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">AI Score</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider hidden md:table-cell">Recommendation</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider hidden lg:table-cell">Applied</th>
              <th className="relative px-6 py-3.5"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {applications
              .sort((a, b) => (b.ai_screening?.score ?? -1) - (a.ai_screening?.score ?? -1))
              .map((app) => (
                <ClickableRow key={app.id} href={`/dashboard/candidates/${app.id}`}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{app.applicant_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{app.applicant_email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {app.ai_screening ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getScoreColor(app.ai_screening.score)}`}>
                        {app.ai_screening.score}/100
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">
                        {app.status === 'screening' ? 'Analyzing...' : 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {app.ai_screening?.recommendation && (
                      <Badge className={getRecommendationColor(app.ai_screening.recommendation)}>
                        {getRecommendationLabel(app.ai_screening.recommendation)}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={getStatusColor(app.status)}>
                      {getStatusLabel(app.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 hidden lg:table-cell">
                    {formatDate(app.submitted_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DeleteCandidateButton applicationId={app.id} candidateName={app.applicant_name} compact />
                      <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </td>
                </ClickableRow>
              ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
