import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/formatting'
import { InviteForm } from '@/components/dashboard/InviteForm'
import { TestNotificationButton } from '@/components/dashboard/TestNotificationButton'

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
        {/* Members list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Members ({members?.length ?? 0})
              </h2>
            </div>
            <div className="divide-y divide-stone-50">
              {members?.map((member) => {
                const assignedJobs = jobs?.filter(
                  (j) => j.hiring_manager_id === member.id && j.status !== 'closed'
                ) ?? []
                return (
                  <div key={member.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-700 font-semibold text-sm">
                            {member.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge
                          className={
                            member.role === 'admin'
                              ? 'text-purple-700 bg-purple-100'
                              : 'text-blue-700 bg-blue-100'
                          }
                        >
                          {member.role === 'admin' ? 'Admin' : 'Hiring Manager'}
                        </Badge>
                        <span className="text-xs text-gray-400 hidden sm:block">
                          Joined {formatDate(member.created_at)}
                        </span>
                      </div>
                    </div>
                    {assignedJobs.length > 0 && (
                      <div className="mt-2.5 ml-12 flex flex-wrap gap-1.5">
                        {assignedJobs.map((job) => (
                          <span
                            key={job.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs text-stone-500"
                            style={{ backgroundColor: '#f5f0e8' }}
                          >
                            {job.title}
                          </span>
                        ))}
                      </div>
                    )}
                    {member.role === 'hiring_manager' && assignedJobs.length === 0 && (
                      <p className="mt-1.5 ml-12 text-xs text-stone-300 italic">No active jobs assigned</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 space-y-4">
          <InviteForm />

          {/* Outlook notifications test */}
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
