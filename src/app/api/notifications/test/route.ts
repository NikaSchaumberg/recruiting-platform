import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOutlookNotification } from '@/lib/notifications/outlook'

export async function POST() {
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

  try {
    await sendOutlookNotification({
      recipientEmail: profile.email,
      recipientName: profile.full_name,
      applicantName: 'Test Candidate',
      applicantEmail: 'test@example.com',
      jobTitle: 'Test Position',
      jobDepartment: 'Test Department',
      score: 85,
      recommendation: 'strong_yes',
      summary: 'This is a test notification confirming your Outlook email integration is working correctly.',
      strengths: ['Email delivery confirmed', 'Microsoft Graph API connected'],
      gaps: [],
      dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/dashboard/jobs`,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send notification' },
      { status: 500 }
    )
  }
}
