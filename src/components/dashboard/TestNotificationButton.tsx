'use client'

import { useState } from 'react'

export function TestNotificationButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleTest() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/notifications/test', { method: 'POST' })
      const data = await res.json()
      setResult(
        res.ok
          ? { ok: true, message: 'Test email sent — check your inbox.' }
          : { ok: false, message: data.error ?? 'Failed to send test email.' }
      )
    } catch {
      setResult({ ok: false, message: 'Network error.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleTest}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {loading ? 'Sending…' : 'Send test email'}
      </button>
      {result && (
        <p className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-500'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}
