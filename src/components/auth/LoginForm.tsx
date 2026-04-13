'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard/jobs'

  const [mode, setMode] = useState<'login' | 'reset'>('login')

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Reset state
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError(error.message)
      setLoginLoading(false)
      return
    }

    router.push(redirectTo)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })

    setResetLoading(false)

    if (error) {
      setResetError(error.message)
      return
    }

    setResetSent(true)
  }

  function switchToReset() {
    setResetEmail(email) // pre-fill with whatever they typed in login
    setResetError('')
    setResetSent(false)
    setMode('reset')
  }

  // ── Reset form ───────────────────────────────────────────────────────────
  if (mode === 'reset') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Reset your password</h2>
          <p className="text-sm text-gray-400 mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {resetSent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Check your email for a password reset link.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              id="reset-email"
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {resetError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{resetError}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={resetLoading}>
              Send reset link
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setMode('login')}
          className="w-full text-center text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  // ── Login form ───────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        id="email"
        label="Email address"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <div className="space-y-1">
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={switchToReset}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </div>

      {loginError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{loginError}</p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" loading={loginLoading}>
        Sign in
      </Button>
    </form>
  )
}
