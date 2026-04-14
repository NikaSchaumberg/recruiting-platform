import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteForm } from '@/components/dashboard/InviteForm'
import { TestNotificationButton } from '@/components/dashboard/TestNotificationButton'
import { TeamMemberList } from '@/components/dashboard/TeamMemberList'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard/jobs')

  const [{ data: members }, { data: jobs }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('jobs').select('id, title, status, hiring_manager_id').order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif-display" style={{ fontSize: '1.6rem', color: '#1A1A1A' }}>Team</h1>
        <p className="text-sm text-gray-500 mt-1">Manage HR team members and their roles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TeamMemberList
            members={members ?? []}
            jobs={jobs ?? []}
            currentUserId={user.id}
          />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <InviteForm />
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Outlook Notifications</h2>
            <p className="text-xs text-gray-400 mb-4">
              Send a test email to verify your Microsoft Graph integration is working.
            </p>
            <TestNotificationButton />
          </div>
        </div>
      </div>
    </div>
  )
}
