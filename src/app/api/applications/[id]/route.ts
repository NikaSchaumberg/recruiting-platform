export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: Request,
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

  // Fetch the application first so we know the cv_path and job_id
  const { data: application } = await admin
    .from('applications')
    .select('id, cv_path, job_id')
    .eq('id', id)
    .single()

  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Hiring managers can only delete candidates on their own jobs
  if (profile.role === 'hiring_manager') {
    const { data: job } = await admin
      .from('jobs')
      .select('hiring_manager_id')
      .eq('id', application.job_id)
      .single()
    if (job?.hiring_manager_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 1. Remove CV from storage (non-fatal if already missing)
  if (application.cv_path) {
    const { error: storageError } = await admin.storage
      .from('cvs')
      .remove([application.cv_path])
    if (storageError) {
      console.warn('[delete] CV storage removal failed (continuing):', storageError.message)
    }
  }

  // 2. Delete the application row — cascade removes emails, messages, ai_screenings
  const { error: dbError } = await admin
    .from('applications')
    .delete()
    .eq('id', id)

  if (dbError) {
    console.error('[delete] Application delete failed:', dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, jobId: application.job_id })
}
