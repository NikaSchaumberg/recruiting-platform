'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const ROLE_OPTIONS = [
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'admin', label: 'Admin' },
]

export function InviteForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('hiring_manager')
  const [password, setPassword] = useState('')
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('')
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
        body: JSON.stringify({ email, full_name: fullName, role, password, teams_webhook_url: teamsWebhookUrl || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create user')
      }

      setSuccess(true)
      setEmail('')
      setFullName('')
      setPassword('')
      setRole('hiring_manager')
      setTeamsWebhookUrl('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Add Team Member</h2>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700">Team member created successfully!</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="full_name"
          label="Full name"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          id="invite_email"
          label="Email address"
          type="email"
          placeholder="jane@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="invite_password"
          label="Temporary password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Select
          id="invite_role"
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            if (e.target.value !== 'hiring_manager') setTeamsWebhookUrl('')
          }}
        />
        {role === 'hiring_manager' && (
          <div>
            <Input
              id="invite_teams_webhook"
              label="Personal Teams Webhook URL (optional)"
              type="url"
              placeholder="https://..."
              value={teamsWebhookUrl}
              onChange={(e) => setTeamsWebhookUrl(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">
              Create a webhook in your personal Teams channel to receive private notifications.
            </p>
          </div>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          Create Account
        </Button>
      </form>
      <p className="text-xs text-gray-400 mt-3">
        Share the credentials with the team member. They can update their password after logging in.
      </p>
    </div>
  )
}
