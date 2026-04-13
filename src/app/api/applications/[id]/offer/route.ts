export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/** GET /api/applications/[id]/offer — fetch existing offer */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('offers')
    .select('*')
    .eq('application_id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offer: data ?? null })
}

/** POST /api/applications/[id]/offer — create or update offer (upsert) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await request.json()

  const { data, error } = await admin
    .from('offers')
    .upsert(
      {
        application_id: id,
        candidate_name: body.candidate_name ?? '',
        job_title: body.job_title ?? '',
        department: body.department ?? '',
        location: body.location ?? '',
        start_date: body.start_date ?? null,
        salary: body.salary ?? null,
        employment_type: body.employment_type ?? 'full_time',
        reporting_manager: body.reporting_manager ?? '',
        benefits: body.benefits ?? '',
        notes: body.notes ?? '',
        hr_name: body.hr_name ?? '',
        status: body.status ?? 'draft',
      },
      { onConflict: 'application_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offer: data })
}
