export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: contract } = await admin
    .from('contracts')
    .select('*')
    .eq('application_id', id)
    .maybeSingle()

  return NextResponse.json({ contract })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'hiring_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  const { data: contract, error } = await admin
    .from('contracts')
    .upsert({
      application_id: id,
      offer_id:           body.offer_id ?? null,
      candidate_name:     body.candidate_name,
      job_title:          body.job_title,
      department:         body.department ?? null,
      location:           body.location ?? null,
      start_date:         body.start_date ?? null,
      salary:             body.salary ?? null,
      employment_type:    body.employment_type ?? null,
      reporting_manager:  body.reporting_manager ?? null,
      benefits:           body.benefits ?? null,
      additional_terms:   body.additional_terms ?? null,
      hr_name:            body.hr_name ?? null,
      status:             body.status ?? 'draft',
    }, { onConflict: 'application_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contract })
}
