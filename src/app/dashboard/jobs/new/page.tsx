import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobForm } from '@/components/dashboard/JobForm'

export default async function NewJobPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard/jobs')

  // Fetch hiring managers for the assignment dropdown
  const { data: hiringManagers } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('role', 'hiring_manager')
    .order('full_name')

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Post a New Job</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details and set screening criteria for AI evaluation.</p>
      </div>
      <JobForm hiringManagers={hiringManagers ?? []} />
    </div>
  )
}
