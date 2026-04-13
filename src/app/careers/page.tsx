import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PublicNavbar } from '@/components/navigation/PublicNavbar'
import { JobRow } from '@/components/careers/JobRow'
import type { Job } from '@/types/database'

export const revalidate = 60

// Every section uses this same wrapper — guarantees identical left start position
function SectionContainer({ children, paddingTop = '64px', paddingBottom = '64px' }: {
  children: React.ReactNode
  paddingTop?: string
  paddingBottom?: string
}) {
  return (
    <div style={{ paddingLeft: '180px', paddingRight: '180px', paddingTop, paddingBottom }}>
      {children}
    </div>
  )
}

function WavyUnderline() {
  return (
    <svg
      aria-hidden="true"
      width="64" height="10"
      viewBox="0 0 64 10"
      fill="none"
      style={{ display: 'block', marginTop: '6px' }}
    >
      <path
        d="M 1,7 C 9,3 18,9 28,6 C 38,3 48,8 56,5 C 59,4 62,5 64,6"
        stroke="#C4A882" strokeWidth="2" strokeLinecap="round" fill="none"
      />
    </svg>
  )
}

export default async function CareersPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const groupedJobs = (jobs as Job[] ?? []).reduce(
    (acc, job) => {
      const dept = job.department || 'Other'
      if (!acc[dept]) acc[dept] = []
      acc[dept].push(job)
      return acc
    },
    {} as Record<string, Job[]>
  )

  const totalJobs = jobs?.length ?? 0
  const totalDepts = Object.keys(groupedJobs).length

  return (
    <div style={{ backgroundColor: '#F5F0E8', minHeight: '100vh' }}>
      <PublicNavbar />

      {/* ── HERO ── */}
      <section style={{ backgroundColor: '#F5F0E8' }}>
        <SectionContainer paddingTop="80px" paddingBottom="80px">
          <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{
              fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.2em',
              color: '#C4A882', marginBottom: '6px',
            }}>
              Exxir Recruiting Workspace
            </p>
            <div style={{ width: '24px', height: '1.5px', backgroundColor: '#C4A882' }} />
          </div>

          <h1 className="font-serif-display" style={{
            fontSize: '92px', lineHeight: 1.05,
            color: '#1C1917', marginBottom: '28px',
          }}>
            <span style={{ position: 'relative', display: 'inline-block', marginRight: '0.15em' }}>
              Build
              <svg
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '-18px', left: '-18px',
                  width: 'calc(100% + 36px)',
                  height: 'calc(100% + 36px)',
                  overflow: 'visible',
                  pointerEvents: 'none',
                }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path
                  d="M 11,49 C 8,17 28,2 51,1 C 75,0 96,17 97,48 C 99,78 80,99 50,98 C 22,97 5,78 11,49 Z"
                  stroke="#C4A882" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
            {' something '}
            <span style={{ position: 'relative', display: 'inline-block' }}>
              meaningful.
              <svg
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: '-10px', left: '-2px',
                  width: 'calc(100% + 4px)',
                  height: '12px',
                  overflow: 'visible',
                  pointerEvents: 'none',
                }}
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
              >
                <path
                  d="M 0,7 C 22,3 46,9 74,6 C 102,3 126,8 154,5 C 172,3 188,6 200,5"
                  stroke="#C4A882" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
          </h1>

          <p style={{
            fontSize: '20px', lineHeight: 1.7,
            color: '#78716C', marginBottom: '16px',
          }}>
            We create places for everyday life — thoughtful, enduring, and carefully built. Join us.
          </p>

          {totalJobs > 0 && (
            <p style={{ fontSize: '13px', color: '#A09890' }}>
              {totalJobs} open position{totalJobs !== 1 ? 's' : ''}
            </p>
          )}
          </div>
        </SectionContainer>
      </section>

      {/* ── OPEN POSITIONS ── */}
      <section style={{ backgroundColor: '#F5F0E8' }}>
        <SectionContainer paddingTop="40px" paddingBottom="64px">

          <div style={{ marginBottom: '32px' }}>
            <h2 className="font-serif-display" style={{ fontSize: '40px', color: '#1C1917', lineHeight: 1.1 }}>
              Open Positions
            </h2>
            <WavyUnderline />
          </div>

          {Object.keys(groupedJobs).length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF', borderRadius: '12px',
              border: '1px solid #E8E2D8', padding: '48px', textAlign: 'center',
            }}>
              <p className="font-serif-display" style={{ fontSize: '20px', color: '#1C1917', marginBottom: '8px' }}>
                No open positions right now
              </p>
              <p style={{ fontSize: '15px', color: '#78716C' }}>
                We&apos;re always growing — check back soon.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(groupedJobs).map(([department, deptJobs]) => (
                <div
                  key={department}
                  style={{
                    backgroundColor: '#FFFFFF', borderRadius: '12px',
                    border: '1px solid #E8E2D8', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ padding: '12px 24px', borderBottom: '1px solid #F0EBE3', backgroundColor: '#FDFAF6' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#C4A882' }}>
                      {department}
                    </p>
                  </div>
                  {deptJobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </SectionContainer>
      </section>

      {/* ── HOW WE HIRE ── */}
      <section style={{ backgroundColor: '#F5F0E8' }}>
        <SectionContainer paddingTop="0" paddingBottom="80px">

          <div style={{ marginBottom: '32px' }}>
            <h2 className="font-serif-display" style={{ fontSize: '40px', color: '#1C1917', lineHeight: 1.1 }}>
              How we hire
            </h2>
            <WavyUnderline />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              {
                num: '01', title: 'Application',
                desc: 'We review every application and reply within a week.',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="3" y="2" width="11" height="14" rx="1.5" stroke="#C4A882" strokeWidth="1.5" />
                    <path d="M6 6h5M6 9h5M6 12h3" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" />
                    <rect x="10" y="10" width="7" height="8" rx="1" fill="#F5F0E8" stroke="#C4A882" strokeWidth="1.2" />
                    <path d="M12 13h3M12 15h2" stroke="#C4A882" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: '02', title: 'Intro',
                desc: 'A short call to get to know each other.',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 3h3l1.5 3.5-2 1.2a9.5 9.5 0 004.8 4.8l1.2-2L17 12v3c0 1-1 2-2 1.8C7 15.2 4.8 13 3.2 7 3 6 4 5 5 5V3z" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                num: '03', title: 'Deep dive',
                desc: 'We explore your experience, thinking, and ambitions.',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H7l-4 3V5z" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 8h6M7 11h4" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                num: '04', title: 'Final',
                desc: 'Meet the team and align on the role and next steps.',
                icon: (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M10 2l2.4 4.8 5.3.8-3.85 3.75.91 5.3L10 14.1l-4.76 2.55.91-5.3L2.3 7.6l5.3-.8L10 2z" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
            ].map((step) => (
              <div key={step.num} style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E2D8',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ marginBottom: '10px' }}>{step.icon}</div>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#C4A882', marginBottom: '8px' }}>
                  {step.num}
                </p>
                <p className="font-serif-display" style={{ fontSize: '16px', fontWeight: 700, color: '#1C1917', lineHeight: 1.3, marginBottom: '8px' }}>
                  {step.title}
                </p>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#78716C' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </SectionContainer>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: '#1C1917' }}>
        <div style={{ padding: '28px 60px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#A09890' }}>
            © 2026 Exxir Capital. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  )
}
