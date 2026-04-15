'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/formatting'
import type { Profile } from '@/types/database'

interface Job { id: string; title: string; status: string; hiring_manager_id: string | null }

interface Props {
  members: Profile[]
  jobs: Job[]
  currentUserId: string
}

const C = { caramel: '#C4A882', bg: '#faf6ef' }

export function TeamMemberList({ members: initial, jobs, currentUserId }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editWebhook, setEditWebhook] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [togglingRole, setTogglingRole] = useState<string | null>(null)

  function openEdit(m: Profile) {
    setEditingId(m.id)
    setEditName(m.full_name)
    setEditEmail(m.email)
    setEditWebhook((m as any).teams_webhook_url ?? '')
    setEditPassword('')
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditPassword('')
    setEditError(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setEditError(null)
    try {
      if (editPassword && editPassword.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }
      const res = await fetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editName,
          email: editEmail,
          teams_webhook_url: editWebhook,
          ...(editPassword ? { password: editPassword } : {}),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { profile } = await res.json()
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...profile } : m))
      setEditingId(null)
      router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function resetPassword(id: string) {
    setResetting(id)
    try {
      const res = await fetch(`/api/team/${id}/reset-password`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      setResetDone(id)
      setTimeout(() => setResetDone(null), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reset')
    } finally {
      setResetting(null)
    }
  }

  async function toggleRole(member: Profile) {
    const newRole = member.role === 'admin' ? 'hiring_manager' : 'admin'
    const label = newRole === 'admin' ? 'Admin' : 'Hiring Manager'
    if (!confirm(`Change ${member.full_name}'s role to ${label}?`)) return
    setTogglingRole(member.id)
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { profile } = await res.json()
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, ...profile } : m))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setTogglingRole(null)
    }
  }

  async function deleteMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setMembers(prev => prev.filter(m => m.id !== id))
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const cls = 'w-full text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300'

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-stone-100" style={{ backgroundColor: C.bg }}>
        <h2 className="text-sm font-semibold text-gray-900">Members ({members.length})</h2>
      </div>

      <div className="divide-y divide-stone-50">
        {members.map((member) => {
          const assignedJobs = jobs.filter(j => j.hiring_manager_id === member.id && j.status !== 'closed')
          const isEditing = editingId === member.id
          const isSelf = member.id === currentUserId

          return (
            <div key={member.id} className="px-6 py-4">
              {isEditing ? (
                /* ── Edit form ── */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)} className={cls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className={cls} type="email" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Teams Webhook URL</label>
                    <input value={editWebhook} onChange={e => setEditWebhook(e.target.value)} className={cls} placeholder="https://…" />
                    <p className="text-xs text-stone-400 mt-0.5">Personal Teams channel webhook for notifications (optional)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Set New Password</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      className={cls}
                      placeholder="Leave blank to keep unchanged"
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-stone-400 mt-0.5">Min. 8 characters · leave blank to keep current password</p>
                  </div>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(member.id)} disabled={saving}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: C.caramel }}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Display row ── */
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-700 font-semibold text-sm">
                        {member.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                        {isSelf && <span className="text-xs text-stone-400 italic">you</span>}
                      </div>
                      <p className="text-xs text-gray-400">{member.email}</p>
                      {assignedJobs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assignedJobs.map(j => (
                            <span key={j.id} className="inline-flex px-1.5 py-0.5 rounded text-xs text-stone-500" style={{ backgroundColor: '#f5f0e8' }}>
                              {j.title}
                            </span>
                          ))}
                        </div>
                      )}
                      {member.role === 'hiring_manager' && assignedJobs.length === 0 && (
                        <p className="text-xs text-stone-300 italic mt-0.5">No active jobs assigned</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelf ? (
                      <Badge className={member.role === 'admin' ? 'text-purple-700 bg-purple-100' : 'text-blue-700 bg-blue-100'}>
                        {member.role === 'admin' ? 'Admin' : 'Hiring Manager'}
                      </Badge>
                    ) : (
                      <button
                        onClick={() => toggleRole(member)}
                        disabled={togglingRole === member.id}
                        title={`Click to change to ${member.role === 'admin' ? 'Hiring Manager' : 'Admin'}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer"
                        style={
                          member.role === 'admin'
                            ? { backgroundColor: '#f3e8ff', color: '#7e22ce' }
                            : { backgroundColor: '#dbeafe', color: '#1d4ed8' }
                        }
                        onMouseOver={(e) => { e.currentTarget.style.opacity = '0.75' }}
                        onMouseOut={(e) => { e.currentTarget.style.opacity = '1' }}
                      >
                        {togglingRole === member.id ? '…' : (member.role === 'admin' ? 'Admin' : 'Hiring Manager')}
                        {togglingRole !== member.id && (
                          <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                          </svg>
                        )}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 hidden sm:block">{formatDate(member.created_at)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => openEdit(member)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-gray-700 hover:bg-stone-100 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => resetPassword(member.id)}
                        disabled={resetting === member.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors disabled:opacity-50"
                        style={{ color: resetDone === member.id ? '#16a34a' : '#78716c', backgroundColor: resetDone === member.id ? '#f0fdf4' : '#f5f5f4' }}
                        title="Send password reset email"
                      >
                        {resetDone === member.id ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Sent
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            {resetting === member.id ? 'Sending…' : 'Reset email'}
                          </>
                        )}
                      </button>

                      {!isSelf && (
                        <button
                          onClick={() => deleteMember(member.id, member.full_name)}
                          disabled={deleting === member.id}
                          className="p-1.5 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete member"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
