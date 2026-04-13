'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard/jobs')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#faf6ef' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/Exxir_6Logo.svg" alt="Exxir" style={{ height: '40px', width: 'auto', display: 'block' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-sm text-gray-400 mt-1.5">Choose a new password for your account.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="new-password"
              label="New password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              id="confirm-password"
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
