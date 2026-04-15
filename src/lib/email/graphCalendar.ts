import { getGraphToken, cleanEnv } from './graphEmail'

export interface TimeSlot {
  start: string // ISO
  end: string   // ISO
}

/**
 * Fetch free/busy availability for a list of interviewers over the next 14 days.
 * Returns merged available slots (business hours 9am–7pm Eastern = 13:00–23:00 UTC)
 * that are free for ALL requested interviewers.
 *
 * Uses Graph `getSchedule` on the sender mailbox (app-only auth).
 */
export async function getInterviewerAvailability(
  interviewerEmails: string[],
  durationMinutes: number
): Promise<TimeSlot[]> {
  if (interviewerEmails.length === 0) return []

  const senderEmail = cleanEnv(process.env.GRAPH_SENDER_EMAIL)
  if (!senderEmail) throw new Error('GRAPH_SENDER_EMAIL not configured')

  const token = await getGraphToken()

  // Window: now → now + 14 days
  const startTime = new Date()
  startTime.setMinutes(0, 0, 0) // round to hour
  const endTime = new Date(startTime.getTime() + 14 * 24 * 60 * 60 * 1000)

  const body = {
    schedules: interviewerEmails,
    startTime: {
      dateTime: startTime.toISOString().replace('Z', ''),
      timeZone: 'UTC',
    },
    endTime: {
      dateTime: endTime.toISOString().replace('Z', ''),
      timeZone: 'UTC',
    },
    availabilityViewInterval: durationMinutes,
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/calendar/getSchedule`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (res.status === 403) {
    console.warn('[GraphCalendar] getSchedule 403 — missing Calendars.Read app permission')
    throw Object.assign(new Error('getSchedule 403: missing Calendars.Read permission'), { code: 'CALENDAR_FORBIDDEN' })
  }
  if (!res.ok) {
    const text = await res.text()
    console.error('[GraphCalendar] getSchedule failed:', res.status, text)
    throw new Error(`getSchedule failed: ${res.status}`)
  }

  const data = await res.json()
  const schedules: Array<{ availabilityView: string }> = data.value ?? []

  if (schedules.length === 0) return []

  // availabilityView is a string of chars, one per interval:
  // '0' = free, '1' = tentative, '2' = busy, '3' = out of office, '4' = working elsewhere
  // We only count '0' (free) as available.

  const intervalCount = schedules[0].availabilityView.length
  const slots: TimeSlot[] = []

  for (let i = 0; i < intervalCount; i++) {
    // All interviewers must be free
    const allFree = schedules.every((s) => s.availabilityView[i] === '0')
    if (!allFree) continue

    const slotStart = new Date(startTime.getTime() + i * durationMinutes * 60 * 1000)
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000)

    // Filter to business hours: 9am–7pm Eastern (UTC-5 winter / UTC-4 summer)
    // To keep it simple, use 13:00–23:00 UTC (covers both)
    const utcHour = slotStart.getUTCHours()
    if (utcHour < 13 || utcHour >= 23) continue

    // Don't show slots in the past (add 1h buffer)
    if (slotStart.getTime() < Date.now() + 60 * 60 * 1000) continue

    slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() })
  }

  // Return at most 20 slots to keep the UI manageable
  return slots.slice(0, 20)
}

export interface CreatedEvent {
  id: string
  webLink?: string
  onlineMeeting?: { joinUrl: string } | null
}

/**
 * Create a calendar event for all interviewers via Graph API (app-only auth).
 * If `createTeamsMeeting` is true, sets `isOnlineMeeting: true` so Graph
 * auto-generates a Teams link.
 */
export async function createInterviewCalendarEvent(params: {
  subject: string
  body: string
  start: string      // ISO
  end: string        // ISO
  attendeeEmails: string[]
  location?: string
  createTeamsMeeting?: boolean
}): Promise<CreatedEvent> {
  const senderEmail = cleanEnv(process.env.GRAPH_SENDER_EMAIL)
  if (!senderEmail) throw new Error('GRAPH_SENDER_EMAIL not configured')

  const token = await getGraphToken()

  const event: Record<string, unknown> = {
    subject: params.subject,
    body: { contentType: 'Text', content: params.body },
    start: { dateTime: params.start.replace('Z', ''), timeZone: 'UTC' },
    end: { dateTime: params.end.replace('Z', ''), timeZone: 'UTC' },
    attendees: params.attendeeEmails.map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    })),
    isOnlineMeeting: params.createTeamsMeeting === true,
    onlineMeetingProvider: params.createTeamsMeeting ? 'teamsForBusiness' : undefined,
  }

  if (params.location && !params.createTeamsMeeting) {
    event.location = { displayName: params.location }
  }

  // Create the event on behalf of the sender mailbox
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[GraphCalendar] createEvent failed:', res.status, text)
    throw new Error(`createEvent failed: ${res.status} ${text}`)
  }

  const created = await res.json()
  return {
    id: created.id,
    webLink: created.webLink,
    onlineMeeting: created.onlineMeeting ?? null,
  }
}

/**
 * Update an existing calendar event via Graph API (app-only auth).
 * If the event returns 404, logs and continues (event may have been deleted externally).
 * Throws on other errors.
 */
export async function updateInterviewCalendarEvent(params: {
  eventId: string
  subject: string
  body: string
  start: string
  end: string
  attendeeEmails: string[]
  location?: string
}): Promise<void> {
  const senderEmail = cleanEnv(process.env.GRAPH_SENDER_EMAIL)
  if (!senderEmail) throw new Error('GRAPH_SENDER_EMAIL not configured')

  const token = await getGraphToken()

  const event: Record<string, unknown> = {
    subject: params.subject,
    body: { contentType: 'Text', content: params.body },
    start: { dateTime: params.start.replace('Z', ''), timeZone: 'UTC' },
    end: { dateTime: params.end.replace('Z', ''), timeZone: 'UTC' },
    attendees: params.attendeeEmails.map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    })),
  }

  if (params.location) {
    event.location = { displayName: params.location }
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/events/${encodeURIComponent(params.eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (res.status === 404) {
    console.warn('[GraphCalendar] updateEvent 404 — event may have been deleted:', params.eventId)
    return
  }

  if (!res.ok) {
    const text = await res.text()
    console.error('[GraphCalendar] updateEvent failed:', res.status, text)
    throw new Error(`updateEvent failed: ${res.status} ${text}`)
  }
}
