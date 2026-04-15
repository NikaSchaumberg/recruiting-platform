'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CalendarInterview {
  id: string
  application_id: string
  scheduled_at: string
  duration_minutes: number
  interview_type: string
  location: string | null
  applicant_name: string
  job_title: string
}

interface Props {
  interviews: CalendarInterview[]
}

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  video:     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  phone:     { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  in_person: { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
}

const TYPE_LABELS: Record<string, string> = {
  video: 'Video',
  phone: 'Phone',
  in_person: 'In person',
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function InterviewCalendar({ interviews }: Props) {
  // today is null during SSR/hydration to prevent #418 (server UTC ≠ client local timezone).
  // It is set on the client after mount; "today" highlighting appears after first paint.
  const [today, setToday] = useState<Date | null>(null)
  const [year, setYear] = useState(() => new Date().getUTCFullYear())
  const [month, setMonth] = useState(() => new Date().getUTCMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }, [])

  // Build grid: first cell = Sunday of the week containing the 1st
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Total cells (always 6 rows × 7 = 42 to keep grid stable)
  const totalCells = 42
  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null)
    } else {
      cells.push(new Date(year, month, dayNum))
    }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
    setSelectedDay(null)
  }

  function interviewsOnDay(day: Date) {
    return interviews.filter((iv) => sameDay(new Date(iv.scheduled_at), day))
  }

  const selectedInterviews = selectedDay ? interviewsOnDay(selectedDay) : []

  // Upcoming interviews (next 5) — filter client-side only; today is null on SSR
  const upcoming = [...interviews]
    .filter((iv) => today === null || new Date(iv.scheduled_at) >= today)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 5)

  if (interviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-400">No interviews scheduled</p>
        <p className="text-xs text-stone-300 mt-1">Open a candidate profile to schedule one</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-stone-100"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Interview Calendar</h2>
        </div>
        <span className="text-xs text-stone-400">{interviews.length} scheduled</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
        {/* ── Calendar grid ── */}
        <div className="p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-sm font-semibold text-gray-800">
              {MONTH_NAMES[month]} {year}
            </p>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="h-10" />

              const dayInterviews = interviewsOnDay(day)
              const isToday = today !== null && sameDay(day, today)
              const isSelected = selectedDay ? sameDay(day, selectedDay) : false
              const hasMeetings = dayInterviews.length > 0

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors relative"
                  style={{
                    backgroundColor: isSelected ? '#C4A882' : isToday ? '#fdf9f4' : 'transparent',
                    fontWeight: isToday || hasMeetings ? 600 : 400,
                  }}
                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f5ede0' }}
                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = isToday ? '#fdf9f4' : 'transparent' }}
                >
                  <span
                    className="text-xs leading-none"
                    style={{ color: isSelected ? '#fff' : isToday ? '#C4A882' : '#374151' }}
                  >
                    {day.getDate()}
                  </span>
                  {hasMeetings && (
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: isSelected ? '#fff' : '#C4A882' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Sidebar: selected day or upcoming list ── */}
        <div className="p-4">
          {selectedDay && selectedInterviews.length > 0 ? (
            <>
              <p suppressHydrationWarning className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <div className="space-y-2">
                {selectedInterviews.map((iv) => {
                  const colors = TYPE_COLORS[iv.interview_type] ?? TYPE_COLORS.video
                  return (
                    <Link
                      key={iv.id}
                      href={`/dashboard/candidates/${iv.application_id}`}
                      className="block p-3 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
                        <span suppressHydrationWarning className="text-xs font-semibold" style={{ color: colors.text }}>
                          {TYPE_LABELS[iv.interview_type]} · {formatTime(iv.scheduled_at)}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: colors.text }}>{iv.duration_minutes}m</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{iv.applicant_name}</p>
                      <p className="text-xs text-stone-500">{iv.job_title}</p>
                      {iv.location && <p className="text-xs text-stone-400 mt-1 truncate">{iv.location}</p>}
                    </Link>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Upcoming</p>
              {upcoming.length === 0 ? (
                <p className="text-xs text-stone-400">No upcoming interviews</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((iv) => {
                    const colors = TYPE_COLORS[iv.interview_type] ?? TYPE_COLORS.video
                    const date = new Date(iv.scheduled_at)
                    return (
                      <Link
                        key={iv.id}
                        href={`/dashboard/candidates/${iv.application_id}`}
                        className="flex items-start gap-3 p-3 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                      >
                        {/* Date badge */}
                        <div className="flex-shrink-0 w-10 text-center rounded-lg py-1" style={{ backgroundColor: '#fdf9f4' }}>
                          <p suppressHydrationWarning className="text-xs text-stone-400 leading-none">{date.toLocaleDateString('en-US', { month: 'short' })}</p>
                          <p className="text-base font-bold text-gray-800 leading-tight">{date.getDate()}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{iv.applicant_name}</p>
                          <p className="text-xs text-stone-500 truncate">{iv.job_title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
                            <span suppressHydrationWarning className="text-xs" style={{ color: colors.text }}>
                              {TYPE_LABELS[iv.interview_type]} · {formatTime(iv.scheduled_at)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
