'use client'

import { useState } from 'react'

interface Interviewer {
  id: string
  full_name: string
  email: string
  role: string
}

interface Interview {
  id: string
  scheduled_at: string
  duration_minutes: number
  interview_type: string
  location: string | null
  notes: string | null
  status: string
  interviewer_emails: string[]
  graph_event_id: string | null
}

interface TimeSlot {
  start: string
  end: string
}

interface Props {
  applicationId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  existingInterviews: Interview[]
  teamMembers: Interviewer[]
}

const TYPE_LABELS: Record<string, string> = {
  video: 'Video call',
  phone: 'Phone call',
  in_person: 'In person',
}

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  video:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  phone:     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  in_person: { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatSlotLabel(slot: TimeSlot) {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  return `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

function buildEmailBody(
  candidateName: string,
  jobTitle: string,
  slot: TimeSlot,
  interviewers: Interviewer[],
  interviewType: string
): string {
  const start = new Date(slot.start)
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  const interviewerNames = interviewers.map((i) => i.full_name).join(', ')
  const typeLabel = TYPE_LABELS[interviewType] ?? interviewType

  return `Dear ${candidateName},

We are pleased to invite you to an interview for the ${jobTitle} position.

Date: ${dateStr}
Time: ${timeStr}
Format: ${typeLabel}
Interviewer(s): ${interviewerNames}

Please let us know if you have any questions or need to reschedule.

Best regards,
HR Team`
}

export function ScheduleInterviewWizard({
  applicationId,
  candidateName,
  candidateEmail,
  jobTitle,
  existingInterviews,
  teamMembers,
}: Props) {
  const [open, setOpen] = useState(false)
  const [interviews, setInterviews] = useState<Interview[]>(existingInterviews)

  // Step: 'list' | 'step1' | 'step2'
  const [step, setStep] = useState<'list' | 'step1' | 'step2'>('list')

  // Reschedule state
  const [reschedulingInterview, setReschedulingInterview] = useState<Interview | null>(null)

  // Step 1 state
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([])
  const [duration, setDuration] = useState(60)
  const [interviewType, setInterviewType] = useState('video')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [availError, setAvailError] = useState<string | null>(null)
  // Fallback: manual picker shown when Graph returns 403 (missing Calendars.Read permission)
  const [manualMode, setManualMode] = useState(false)
  const [manualDateTime, setManualDateTime] = useState('')

  // Step 2 state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [location, setLocation] = useState('')
  const [createTeams, setCreateTeams] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const upcoming = interviews.filter((i) => i.status !== 'cancelled')

  function openModal() {
    setStep(upcoming.length === 0 ? 'step1' : 'list')
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    resetWizard()
  }

  function resetWizard() {
    setStep('list')
    setReschedulingInterview(null)
    setSelectedInterviewers([])
    setSlots([])
    setSelectedSlot(null)
    setAvailError(null)
    setSendError(null)
    setLocation('')
    setCreateTeams(false)
    setManualMode(false)
    setManualDateTime('')
  }

  function handleReschedule(iv: Interview) {
    setReschedulingInterview(iv)
    setSelectedInterviewers(iv.interviewer_emails ?? [])
    setDuration(iv.duration_minutes)
    setInterviewType(iv.interview_type)
    setSlots([])
    setSelectedSlot(null)
    setManualMode(false)
    setManualDateTime('')
    setStep('step1')
  }

  function toggleInterviewer(email: string) {
    setSelectedInterviewers((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    )
  }

  async function handleFetchSlots() {
    if (selectedInterviewers.length === 0) {
      setAvailError('Select at least one interviewer.')
      return
    }
    setLoadingSlots(true)
    setAvailError(null)
    setSlots([])
    setSelectedSlot(null)

    try {
      const res = await fetch('/api/interviews/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewerEmails: selectedInterviewers, durationMinutes: duration }),
      })
      const data = await res.json()
      if (res.status === 403 && data.error === 'calendar_forbidden') {
        // Azure app missing Calendars.Read — fall back to manual picker
        setManualMode(true)
        setSlots([])
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch availability')
      setSlots(data.slots ?? [])
      if ((data.slots ?? []).length === 0) {
        setAvailError('No available slots found in the next 14 days for the selected interviewers.')
      }
    } catch (err) {
      setAvailError(err instanceof Error ? err.message : 'Failed to fetch availability')
    } finally {
      setLoadingSlots(false)
    }
  }

  function handleSelectSlot(slot: TimeSlot) {
    setSelectedSlot(slot)
  }

  function handleNextStep() {
    let slot = selectedSlot
    if (manualMode) {
      if (!manualDateTime) { setAvailError('Please select a date and time.'); return }
      const start = new Date(manualDateTime)
      const end = new Date(start.getTime() + duration * 60 * 1000)
      slot = { start: start.toISOString(), end: end.toISOString() }
      setSelectedSlot(slot)
    }
    if (!slot) { setAvailError('Please select a time slot.'); return }
    const interviewerObjs = teamMembers.filter((m) => selectedInterviewers.includes(m.email))
    const subject = reschedulingInterview
      ? `Interview Rescheduled – ${jobTitle}`
      : `Interview Invitation – ${jobTitle}`
    const baseBody = buildEmailBody(candidateName, jobTitle, slot, interviewerObjs, interviewType)
    const body = reschedulingInterview
      ? `Your interview has been rescheduled.\n\n${baseBody}`
      : baseBody
    setEmailSubject(subject)
    setEmailBody(body)
    setSendError(null)
    setStep('step2')
  }

  async function handleSend() {
    if (!selectedSlot) return
    setSending(true)
    setSendError(null)

    try {
      if (reschedulingInterview !== null) {
        // Reschedule flow
        const res = await fetch('/api/interviews/reschedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId: reschedulingInterview.id,
            interviewerEmails: selectedInterviewers,
            start: selectedSlot.start,
            end: selectedSlot.end,
            durationMinutes: duration,
            interviewType,
            emailSubject,
            emailBody,
            location: location || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to reschedule interview')

        setInterviews((prev) =>
          prev.map((i) =>
            i.id === reschedulingInterview.id
              ? {
                  ...i,
                  scheduled_at: selectedSlot.start,
                  duration_minutes: duration,
                  interview_type: interviewType,
                  location: location || null,
                  interviewer_emails: selectedInterviewers,
                }
              : i
          )
        )
      } else {
        // Schedule new interview flow
        const res = await fetch('/api/interviews/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            interviewerEmails: selectedInterviewers,
            start: selectedSlot.start,
            end: selectedSlot.end,
            durationMinutes: duration,
            interviewType,
            emailSubject,
            emailBody,
            location: location || undefined,
            createTeamsMeeting: createTeams,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to schedule interview')

        if (data.interview) {
          setInterviews((prev) =>
            [...prev, data.interview].sort(
              (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            )
          )
        }
      }

      setStep('list')
      resetWizard()
      setStep('list')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setSending(false)
    }
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/applications/${applicationId}/interviews?interviewId=${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setInterviews((prev) => prev.filter((i) => i.id !== id))
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
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
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {step === 'list' ? 'Interviews' : step === 'step1' ? 'Find Availability' : 'Compose Invite'}
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">{candidateName}</p>
              </div>
              <div className="flex items-center gap-2">
                {step !== 'list' && (
                  <button
                    onClick={() => step === 'step2' ? setStep('step1') : setStep('list')}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors px-2 py-1 rounded-lg hover:bg-stone-50"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {/* ── LIST VIEW ── */}
              {step === 'list' && (
                <div className="space-y-4">
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-stone-400 text-center py-4">No interviews scheduled.</p>
                  ) : (
                    <div className="space-y-2">
                      {upcoming.map((iv) => {
                        const colors = TYPE_COLORS[iv.interview_type] ?? TYPE_COLORS.video
                        return (
                          <div
                            key={iv.id}
                            className="flex items-start justify-between gap-3 p-3 rounded-xl border border-stone-100"
                            style={{ backgroundColor: colors.bg }}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
                                <span className="text-xs font-semibold" style={{ color: colors.text }}>
                                  {TYPE_LABELS[iv.interview_type] ?? iv.interview_type}
                                </span>
                                <span className="text-xs ml-auto" style={{ color: colors.text }}>{iv.duration_minutes}m</span>
                              </div>
                              <p suppressHydrationWarning className="text-sm font-medium text-gray-800">
                                {formatDateTime(iv.scheduled_at)}
                              </p>
                              {iv.location && (
                                <p className="text-xs text-stone-400 mt-0.5 truncate">{iv.location}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleReschedule(iv)}
                                className="text-xs flex-shrink-0 mt-0.5 transition-colors"
                                style={{ color: '#C4A882' }}
                                onMouseOver={(e) => { e.currentTarget.style.color = '#8B6F47' }}
                                onMouseOut={(e) => { e.currentTarget.style.color = '#C4A882' }}
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancel(iv.id)}
                                className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button
                    onClick={() => setStep('step1')}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
                    style={{ backgroundColor: '#C4A882' }}
                  >
                    + Schedule Another
                  </button>
                </div>
              )}

              {/* ── STEP 1: SELECT INTERVIEWERS + FETCH SLOTS ── */}
              {step === 'step1' && (
                <div className="space-y-4">
                  {/* Reschedule notice */}
                  {reschedulingInterview && (
                    <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Rescheduling — pick a new time slot
                    </div>
                  )}

                  {/* Interview type */}
                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Interview type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['video', 'phone', 'in_person'] as const).map((t) => {
                        const colors = TYPE_COLORS[t]
                        const active = interviewType === t
                        return (
                          <button
                            key={t}
                            onClick={() => setInterviewType(t)}
                            className="py-2 rounded-lg text-xs font-medium border transition-all"
                            style={{
                              backgroundColor: active ? colors.bg : '#fafaf9',
                              borderColor: active ? colors.dot : '#e7e5e4',
                              color: active ? colors.text : '#78716c',
                            }}
                          >
                            {TYPE_LABELS[t]}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Duration</label>
                    <div className="flex gap-2 flex-wrap">
                      {DURATION_OPTIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => { setDuration(d); setSlots([]); setSelectedSlot(null) }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                          style={{
                            backgroundColor: duration === d ? '#fdf9f4' : '#fafaf9',
                            borderColor: duration === d ? '#C4A882' : '#e7e5e4',
                            color: duration === d ? '#8B6F47' : '#78716c',
                          }}
                        >
                          {d < 60 ? `${d}m` : d === 60 ? '1h' : d === 90 ? '1.5h' : '2h'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Interviewers */}
                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Interviewers</label>
                    <div className="space-y-1 max-h-36 overflow-y-auto rounded-xl border border-stone-100 p-2">
                      {teamMembers.length === 0 ? (
                        <p className="text-xs text-stone-400 p-2">No team members found.</p>
                      ) : (
                        teamMembers.map((m) => {
                          const checked = selectedInterviewers.includes(m.email)
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleInterviewer(m.email)}
                              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors"
                              style={{ backgroundColor: checked ? '#fdf9f4' : 'transparent' }}
                              onMouseOver={(e) => { if (!checked) e.currentTarget.style.backgroundColor = '#fafaf9' }}
                              onMouseOut={(e) => { if (!checked) e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                              <div
                                className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                                style={{
                                  borderColor: checked ? '#C4A882' : '#d6d3d1',
                                  backgroundColor: checked ? '#C4A882' : 'white',
                                }}
                              >
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                                <p className="text-xs text-stone-400 truncate">{m.email}</p>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Fetch slots button — hidden in manual mode */}
                  {!manualMode && (
                    <button
                      onClick={handleFetchSlots}
                      disabled={loadingSlots || selectedInterviewers.length === 0}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#C4A882' }}
                    >
                      {loadingSlots ? 'Checking calendars…' : 'Find Available Slots'}
                    </button>
                  )}

                  {availError && <p className="text-xs text-red-500">{availError}</p>}

                  {/* Manual datetime picker (fallback when Graph returns 403) */}
                  {manualMode && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-amber-700">
                          Calendar availability check unavailable — Azure app needs{' '}
                          <span className="font-semibold">Calendars.Read</span> permission.
                          Pick a time manually for now.
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-stone-500 block mb-1">Date & Time</label>
                        <input
                          type="datetime-local"
                          value={manualDateTime}
                          onChange={(e) => { setManualDateTime(e.target.value); setAvailError(null) }}
                          className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleNextStep}
                          disabled={!manualDateTime}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                          style={{ backgroundColor: '#C4A882' }}
                        >
                          Next: Compose Invite →
                        </button>
                        <button
                          onClick={() => { setManualMode(false); setAvailError(null) }}
                          className="px-3 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Slot picker (Graph availability) */}
                  {!manualMode && slots.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                        {slots.length} slots available
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {slots.map((slot, i) => {
                          const active = selectedSlot?.start === slot.start
                          return (
                            <button
                              key={i}
                              onClick={() => handleSelectSlot(slot)}
                              suppressHydrationWarning
                              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all border"
                              style={{
                                backgroundColor: active ? '#fdf9f4' : 'transparent',
                                borderColor: active ? '#C4A882' : '#e7e5e4',
                                color: active ? '#8B6F47' : '#374151',
                                fontWeight: active ? 600 : 400,
                              }}
                            >
                              {formatSlotLabel(slot)}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={handleNextStep}
                        disabled={!selectedSlot}
                        className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: '#C4A882' }}
                      >
                        Next: Compose Invite →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: COMPOSE + SEND ── */}
              {step === 'step2' && (
                <div className="space-y-3">
                  {selectedSlot && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <p suppressHydrationWarning className="text-xs text-stone-500">
                        <span className="font-semibold text-gray-700">{formatSlotLabel(selectedSlot)}</span>
                        {' · '}{duration < 60 ? `${duration}m` : duration === 60 ? '1h' : duration === 90 ? '1.5h' : '2h'}
                        {' · '}{TYPE_LABELS[interviewType]}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        To: {candidateEmail}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-stone-500 block mb-1">Email body</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={8}
                      className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none font-mono"
                    />
                  </div>

                  {/* Location / Teams toggle */}
                  {interviewType !== 'phone' && (
                    <div>
                      <label className="text-xs font-medium text-stone-500 block mb-1">
                        {interviewType === 'video' ? 'Location / Meeting link' : 'Address'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => { setLocation(e.target.value); if (e.target.value) setCreateTeams(false) }}
                          disabled={createTeams}
                          placeholder={interviewType === 'video' ? 'https://meet.google.com/…' : 'Office address'}
                          className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:opacity-50"
                        />
                        {interviewType === 'video' && !reschedulingInterview && (
                          <button
                            onClick={() => { setCreateTeams((v) => !v); setLocation('') }}
                            className="px-3 py-2 rounded-lg text-xs font-medium border transition-all flex-shrink-0"
                            style={{
                              backgroundColor: createTeams ? '#eff6ff' : '#fafaf9',
                              borderColor: createTeams ? '#3b82f6' : '#e7e5e4',
                              color: createTeams ? '#1d4ed8' : '#78716c',
                            }}
                          >
                            {createTeams ? '✓ Teams' : 'Use Teams'}
                          </button>
                        )}
                      </div>
                      {createTeams && (
                        <p className="text-xs text-blue-500 mt-1">A Teams meeting link will be generated and added to the email.</p>
                      )}
                    </div>
                  )}

                  {sendError && <p className="text-xs text-red-500">{sendError}</p>}

                  <button
                    onClick={handleSend}
                    disabled={sending || !emailSubject || !emailBody}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: '#C4A882' }}
                  >
                    {sending
                      ? (reschedulingInterview ? 'Rescheduling…' : 'Scheduling…')
                      : (reschedulingInterview ? 'Send Reschedule & Update' : 'Send Invite & Schedule')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
