'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'

interface SidebarProps {
  profile: Profile
}

export function DashboardSidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const navLinks = [
    {
      href: '/dashboard/jobs',
      label: 'Jobs',
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    ...(profile.role === 'admin'
      ? [
          {
            href: '/dashboard/jobs/new',
            label: 'Post a Job',
            icon: (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            href: '/dashboard/email-templates',
            label: 'Email Templates',
            icon: (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ),
          },
          {
            href: '/dashboard/team',
            label: 'Team',
            icon: (
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="fixed inset-y-0 left-0 w-64 flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>

      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img
          src="/Exxir_6Logo.svg"
          alt="Exxir"
          style={{ width: '120px', height: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.9 }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navLinks.map((link) => {
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all"
              style={
                active
                  ? {
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      color: '#fff',
                      borderLeft: '2px solid #C4A882',
                      paddingLeft: 'calc(0.75rem - 2px)',
                    }
                  : {
                      color: 'rgba(255,255,255,0.45)',
                      borderLeft: '2px solid transparent',
                      paddingLeft: 'calc(0.75rem - 2px)',
                    }
              }
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }
              }}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-3 mb-3">
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {profile.full_name}
          </p>
          <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {profile.role.replace('_', ' ')}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}
