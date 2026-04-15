import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmail, cleanEnv } from '@/lib/email/graphEmail'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, role } = body

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name, and role are required' }, { status: 400 })
  }

  if (!['admin', 'hiring_manager'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  // Send Supabase invite — generates a magic link; user lands on /dashboard after setting password
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/dashboard`,
    data: { full_name, role },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Supabase creates the profile via trigger, but role/full_name come from user_metadata.
  // Upsert the profile now so it's immediately correct even if the trigger is slow.
  if (data.user) {
    await adminClient
      .from('profiles')
      .upsert({ id: data.user.id, email, full_name, role }, { onConflict: 'id' })
  }

  // Send branded invite email via Graph (hr@exxircapital.com)
  const roleLabel = role === 'admin' ? 'Admin' : 'Hiring Manager'
  const emailBody = `Hi ${full_name},

You've been invited to the Exxir Recruiting Platform as ${roleLabel}.

Click the link below to set your password and get started:

${siteUrl}/dashboard

If the link above doesn't work, check your email for a separate message from Supabase with your personal invite link.

Welcome to the team,
Exxir HR`

  try {
    await sendGraphEmail({
      to: email,
      toName: full_name,
      subject: 'You\'ve been invited to the Exxir Recruiting Platform',
      body: emailBody,
      from: cleanEnv(process.env.GRAPH_SENDER_EMAIL),
    })
  } catch (emailErr) {
    // Don't fail the invite if email sending fails — the Supabase invite email still goes out
    console.error('[invite] Graph email failed (invite still created):', emailErr)
  }

  return NextResponse.json({ success: true, userId: data.user?.id }, { status: 201 })
}
