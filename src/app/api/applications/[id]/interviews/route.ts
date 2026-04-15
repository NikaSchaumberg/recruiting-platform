export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await admin
    .from('interviews')
    .select('*')
    .eq('application_id', id)
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ interviews: data ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { scheduled_at, duration_minutes = 60, interview_type = 'video', location, notes } = body

  if (!scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 })
  }

  const { data: interview, error } = await admin
    .from('interviews')
    .insert({
      application_id: id,
      scheduled_at,
      duration_minutes,
      interview_type,
      location: location || null,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ interview }, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const interviewId = searchParams.get('interviewId')
  if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

  const { error } = await admin
    .from('interviews')
    .delete()
    .eq('id', interviewId)
    .eq('application_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
