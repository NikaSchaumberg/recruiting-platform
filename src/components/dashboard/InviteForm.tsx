'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = { caramel: '#C4A882', bg: '#fdf9f4', border: '#E8E2D8' }

const ROLE_OPTIONS = [
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'admin', label: 'Admin' },
]

const cls = 'w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300'

export function InviteForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('hiring_manager')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send invite')
      }

      setSuccess(true)
      setEmail('')
      setFullName('')
      setRole('hiring_manager')
      router.refresh()
      // Reset success message after 6s
      setTimeout(() => setSuccess(false), 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div
        className="flex items-center gap-2.5 -mx-6 -mt-6 px-6 py-4 border-b border-stone-100 mb-5 rounded-t-2xl"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #ffffff)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Invite Team Member</h2>
      </div>

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 mb-4 flex items-start gap-2">
          <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-700">Invite sent!</p>
            <p className="text-xs text-green-600 mt-0.5">They'll receive an email with a link to set their password.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
          <input
            type="text"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={cls}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email address</label>
          <input
            type="email"
            placeholder="jane@exxircapital.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={cls}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cls}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 mt-1"
          style={{ backgroundColor: C.caramel }}
        >
          {loading ? 'Sending invite…' : 'Send Invite'}
        </button>
      </form>

      <p className="text-xs text-stone-400 mt-3">
        They'll receive an email from hr@exxircapital.com with a link to set their password.
      </p>
    </div>
  )
}
