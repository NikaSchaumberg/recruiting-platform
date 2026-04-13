export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOutlookNotification } from '@/lib/notifications/outlook'
import { sendTeamsDm } from '@/lib/notifications/teamsDm'

const TEST_PAYLOAD = {
  applicantName: 'Test Candidate',
  applicantEmail: 'test@example.com',
  jobTitle: 'Test Position',
  jobDepartment: 'Test Department',
  score: 85,
  recommendation: 'strong_yes',
  summary: 'This is a test notification confirming your integration is working correctly.',
  strengths: ['Teams DM delivery confirmed', 'Microsoft Graph API connected', 'Chat.Create permission OK'],
  gaps: [],
  dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/dashboard/jobs`,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Optional: ?target=email|teams-dm|all  (default: all)
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('target') ?? 'all'

  const results: Record<string, string> = {}

  if (target === 'email' || target === 'all') {
    try {
      await sendOutlookNotification({
        ...TEST_PAYLOAD,
        recipientEmail: profile.email,
        recipientName: profile.full_name,
      })
      results.email = 'ok'
    } catch (err) {
      results.email = `error: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  if (target === 'teams-dm' || target === 'all') {
    try {
      await sendTeamsDm({
        recipientEmail: profile.email,
        recipientName: profile.full_name,
        applicantName: TEST_PAYLOAD.applicantName,
        applicantEmail: TEST_PAYLOAD.applicantEmail,
        jobTitle: TEST_PAYLOAD.jobTitle,
        score: TEST_PAYLOAD.score,
        recommendation: TEST_PAYLOAD.recommendation,
        strengths: TEST_PAYLOAD.strengths,
        dashboardUrl: TEST_PAYLOAD.dashboardUrl,
      })
      results.teamsDm = 'ok'
    } catch (err) {
      results.teamsDm = `error: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  const hasError = Object.values(results).some((v) => v.startsWith('error'))
  return NextResponse.json({ results }, { status: hasError ? 500 : 200 })
}
