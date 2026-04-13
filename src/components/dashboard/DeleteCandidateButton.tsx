'use client'

import { useState } from 'react'

interface DeleteCandidateButtonProps {
  applicationId: string
  candidateName: string
  /** Where to navigate after deletion. Defaults to /dashboard/jobs. */
  redirectTo?: string
  /** Render as a small trash icon (for table rows) instead of a labeled button */
  compact?: boolean
}

export function DeleteCandidateButton({
  applicationId,
  candidateName,
  redirectTo = '/dashboard/jobs',
  compact = false,
}: DeleteCandidateButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/applications/${applicationId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      // Hard navigation — bypasses Next.js router entirely so the deleted
      // server component is never re-fetched (which would trigger notFound()).
      window.location.replace(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Trigger */}
      {compact ? (
        // Icon-only for table rows — stops row click propagation
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          title={`Delete ${candidateName}`}
          className="p-1.5 rounded-md text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ) : (
        // Labeled button for candidate detail page
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      )}

      {/* Confirmation dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
            onClick={() => !deleting && setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Icon */}
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Delete {candidateName}?
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Are you sure you want to delete this candidate? This will permanently delete their
              application, CV, emails and all associated data. This cannot be undone.
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting && (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
