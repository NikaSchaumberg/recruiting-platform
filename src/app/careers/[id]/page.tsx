import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicNavbar } from '@/components/navigation/PublicNavbar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatEmploymentType } from '@/lib/utils/formatting'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    <div className="min-h-screen" style={{ backgroundColor: '#faf6ef' }}>
      <PublicNavbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back */}
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 mb-8 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All positions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
            <div className="flex flex-wrap gap-2 mb-8">
              {job.department && (
                <Badge className="text-stone-600 bg-stone-100">{job.department}</Badge>
              )}
              <Badge className="text-brand-700 bg-brand-100">
                {formatEmploymentType(job.employment_type)}
              </Badge>
              {job.location && (
                <Badge className="text-stone-600 bg-stone-100">
                  <span className="mr-1">📍</span>{job.location}
                </Badge>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-8">
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">About the Role</h2>
                <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
                  {job.description}
                </div>
              </section>

              {job.requirements && (
                <section>
                  <h2 className="text-base font-semibold text-gray-900 mb-3">Requirements</h2>
                  <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
                    {job.requirements}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-stone-200 p-6 sticky top-24 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-5">Apply for this role</h2>
              <div className="space-y-3 text-sm text-gray-500 mb-6">
                {job.department && (
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {job.department}
                  </div>
                )}
                {job.location && (
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Posted {formatDate(job.created_at)}
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {formatEmploymentType(job.employment_type)}
                </div>
              </div>
              <Link href={`/careers/${job.id}/apply`} className="block">
                <Button className="w-full" size="lg">
                  Apply Now
                </Button>
              </Link>
              <p className="text-xs text-stone-400 text-center mt-3">
                Takes about 5 minutes
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
