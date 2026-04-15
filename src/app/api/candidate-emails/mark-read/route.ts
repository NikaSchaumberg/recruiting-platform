export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/candidate-emails/mark-read
 * Body: { application_id: string }
 *
 * Marks all inbound emails for the given application as read.
 * Called when a team member opens a candidate profile.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { application_id } = await request.json()
  if (!application_id) return NextResponse.json({ error: 'application_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('candidate_emails')
    .update({ read: true })
    .eq('application_id', application_id)
    .eq('direction', 'inbound')
    .eq('read', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
