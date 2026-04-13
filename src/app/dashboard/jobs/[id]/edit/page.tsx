import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { JobForm } from '@/components/dashboard/JobForm'

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single()
  if (!job) notFound()

  const { data: hiringManagers } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('role', 'hiring_manager')
    .order('full_name')

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Job</h1>
        <p className="text-sm text-gray-500 mt-1">Update job details and screening criteria.</p>
      </div>
      <JobForm hiringManagers={hiringManagers ?? []} initialValues={job} />
    </div>
  )
}
