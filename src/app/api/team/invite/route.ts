import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  const { email, full_name, role, password, teams_webhook_url } = body

  if (!email || !full_name || !role || !password) {
    return NextResponse.json(
      { error: 'email, full_name, role, and password are required' },
      { status: 400 }
    )
  }

  if (!['admin', 'hiring_manager'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (teams_webhook_url && data.user) {
    await adminClient
      .from('profiles')
      .update({ teams_webhook_url })
      .eq('id', data.user.id)
  }

  return NextResponse.json({ success: true, userId: data.user?.id }, { status: 201 })
}
