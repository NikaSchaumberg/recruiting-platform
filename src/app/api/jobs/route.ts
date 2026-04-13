import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { title, department, location, employment_type, description, requirements, screening_criteria, status, hiring_manager_id } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      title,
      department: department ?? '',
      location: location ?? '',
      employment_type: employment_type ?? 'full_time',
      description,
      requirements: requirements ?? '',
      screening_criteria: screening_criteria ?? '',
      status: status ?? 'open',
      hiring_manager_id: hiring_manager_id || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
