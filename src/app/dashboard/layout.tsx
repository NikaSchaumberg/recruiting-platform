import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/navigation/DashboardSidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const firstName = profile.full_name.split(' ')[0]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      <DashboardSidebar profile={profile} />
      <div className="ml-64">
        <div className="px-10 pt-10 pb-2">
          <p className="font-serif-display" style={{ fontSize: '2rem', color: '#1A1A1A', lineHeight: 1.2 }}>
            Hello, {firstName}.
          </p>
        </div>
        <main className="px-10 py-8">{children}</main>
      </div>
    </div>
  )
}
