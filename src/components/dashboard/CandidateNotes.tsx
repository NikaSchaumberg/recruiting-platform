'use client'

import { useState, useRef, useEffect } from 'react'

interface CandidateNotesProps {
  applicationId: string
  initialNotes: string | null
}

export function CandidateNotes({ applicationId, initialNotes }: CandidateNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function save(value: string) {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/applications/${applicationId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(value: string) {
    setNotes(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(value), 900)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Private Notes</h2>
        <span className="text-xs" style={{ color: saving ? '#9ca3af' : saved ? '#16a34a' : 'transparent' }}>
          {saving ? 'Saving…' : 'Saved'}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add private notes about this candidate — visible only to your team."
        rows={5}
        className="w-full text-sm text-gray-700 placeholder-stone-300 resize-none focus:outline-none leading-relaxed"
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  )
}
