import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInterviewerAvailability } from '@/lib/email/graphCalendar'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'hiring_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { interviewerEmails, durationMinutes } = body as {
    interviewerEmails?: string[]
    durationMinutes?: number
  }

  if (!interviewerEmails || interviewerEmails.length === 0) {
    return NextResponse.json({ error: 'interviewerEmails required' }, { status: 400 })
  }
  if (!durationMinutes || ![30, 45, 60, 90, 120].includes(durationMinutes)) {
    return NextResponse.json({ error: 'durationMinutes must be 30, 45, 60, 90, or 120' }, { status: 400 })
  }

  try {
    const slots = await getInterviewerAvailability(interviewerEmails, durationMinutes)
    return NextResponse.json({ slots })
  } catch (err) {
    const code = (err as { code?: string }).code
    if (code === 'CALENDAR_FORBIDDEN') {
      return NextResponse.json({ error: 'calendar_forbidden' }, { status: 403 })
    }
    const message = err instanceof Error ? err.message : 'Failed to fetch availability'
    console.error('[availability] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
