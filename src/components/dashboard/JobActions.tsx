'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface JobActionsProps {
  jobId: string
  jobTitle: string
  jobStatus: string
  isAdmin: boolean
}

export function JobActions({ jobId, jobTitle, jobStatus, isAdmin }: JobActionsProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [archiving, setArchiving] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh()
    } catch {
      alert('Failed to delete job')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) throw new Error('Failed to archive')
      router.refresh()
    } catch {
      alert('Failed to archive job')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
        <Link href={`/dashboard/jobs/${jobId}`} className="text-sm text-brand-600 hover:text-brand-700 font-semibold">
          View
        </Link>
        {isAdmin && (
          <>
            <Link href={`/dashboard/jobs/${jobId}/edit`} className="text-sm text-gray-400 hover:text-gray-600">
              Edit
            </Link>
            {jobStatus === 'open' && (
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="text-sm text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
              >
                {archiving ? '…' : 'Archive'}
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Delete job?</h3>
            <p className="text-sm font-medium text-gray-700 mb-2">"{jobTitle}"</p>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this job? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
