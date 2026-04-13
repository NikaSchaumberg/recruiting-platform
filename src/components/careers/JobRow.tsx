'use client'

import Link from 'next/link'
import { useState } from 'react'
import { formatEmploymentType } from '@/lib/utils/formatting'
import type { Job } from '@/types/database'

export function JobRow({ job }: { job: Job }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/careers/${job.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 24px',
        borderBottom: '1px solid #E8E2D8',
        textDecoration: 'none',
        backgroundColor: hovered ? '#F5F0E8' : '#FFFFFF',
        transition: 'background-color 0.15s ease',
      }}
    >
      <span style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1C1917' }}>
        {job.title}
      </span>
      <span style={{ fontSize: '14px', color: '#78716C', flexShrink: 0 }}>
        {[job.location, formatEmploymentType(job.employment_type)].filter(Boolean).join(' · ')}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#C4A882', flexShrink: 0, minWidth: '56px', textAlign: 'right', opacity: hovered ? 1 : 0.8, transition: 'opacity 0.15s ease' }}>
        Apply →
      </span>
    </Link>
  )
}
