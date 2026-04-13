'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

interface ClickableRowProps {
  href: string
  children: ReactNode
  className?: string
}

export function ClickableRow({ href, children, className = '' }: ClickableRowProps) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(href)}
      className={`cursor-pointer hover:bg-cream-100 transition-colors ${className}`}
    >
      {children}
    </tr>
  )
}
