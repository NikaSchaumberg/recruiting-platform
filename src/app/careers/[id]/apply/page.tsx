import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicNavbar } from '@/components/navigation/PublicNavbar'
import { ApplicationWizard } from '@/components/careers/ApplicationWizard'

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('status', 'open')
    .single()

  if (!job) notFound()

  return (
    <div style={{ backgroundColor: '#F5F0E8', minHeight: '100vh' }}>
      <PublicNavbar />
      <ApplicationWizard job={job} />
    </div>
  )
}
