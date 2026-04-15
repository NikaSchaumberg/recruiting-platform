'use client'

import { useState } from 'react'

interface Interview {
  id: string
  scheduled_at: string
  duration_minutes: number
  interview_type: string
  location: string | null
  notes: string | null
  status: string
}

interface Props {
  applicationId: string
  candidateName: string
  existingInterviews: Interview[]
}

const TYPE_LABELS: Record<string, string> = {
  video: 'Video call',
  phone: 'Phone call',
  in_person: 'In person',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function ScheduleInterviewModal({ applicationId, candidateName, existingInterviews }: Props) {
  const [open, setOpen] = useState(false)
  const [interviews, setInterviews] = useState<Interview[]>(existingInterviews)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [type, setType] = useState('video')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSave() {
    if (!scheduledAt) { setError('Please select a date and time.'); return }
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/applications/${applicationId}/interviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        interview_type: type,
        location: location || null,
        notes: notes || null,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }

    setInterviews((prev) => [...prev, data.interview].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    ))
    // Reset form
    setScheduledAt('')
    setDuration(60)
    setType('video')
    setLocation('')
    setNotes('')
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/applications/${applicationId}/interviews?interviewId=${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setInterviews((prev) => prev.filter((i) => i.id !== id))
    }
  }

  const upcoming = interviews.filter((i) => i.status !== 'cancelled')

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
        style={{ borderColor: '#C4A882', color: '#8B6F47', backgroundColor: '#fdf9f4' }}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f5ede0' }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fdf9f4' }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {upcoming.length > 0 ? `${upcoming.length} Interview${upcoming.length > 1 ? 's' : ''}` : 'Schedule Interview'}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Schedule Interview</h2>
                <p className="text-xs text-stone-400 mt-0.5">{candidateName}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Existing interviews */}
              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Scheduled</p>
                  {upcoming.map((iv) => (
                    <div key={iv.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <div className="min-w-0">
                        <p suppressHydrationWarning className="text-sm font-medium text-gray-800">{formatDateTime(iv.scheduled_at)}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {TYPE_LABELS[iv.interview_type] ?? iv.interview_type} · {iv.duration_minutes} min
                          {iv.location ? ` · ${iv.location}` : ''}
                        </p>
                        {iv.notes && <p className="text-xs text-stone-400 mt-0.5 italic">{iv.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleCancel(iv.id)}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-stone-100 pt-3">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Add another</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                      <option value="video">Video call</option>
                      <option value="phone">Phone call</option>
                      <option value="in_person">In person</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">
                    {type === 'video' ? 'Meeting link' : type === 'phone' ? 'Phone number' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={type === 'video' ? 'https://meet.google.com/…' : type === 'phone' ? '+1 (555) …' : 'Office address'}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-500 block mb-1">Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Topics to cover, preparation instructions…"
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  />
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#C4A882' }}
                >
                  {saving ? 'Saving…' : 'Schedule Interview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
