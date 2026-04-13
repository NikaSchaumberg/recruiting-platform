'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import type { Profile } from '@/types/database'

interface JobFormProps {
  hiringManagers: Profile[]
  initialValues?: {
    id?: string
    title?: string
    department?: string
    location?: string
    employment_type?: string
    description?: string
    requirements?: string
    screening_criteria?: string
    status?: string
    hiring_manager_id?: string | null
  }
}

const EMPLOYMENT_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
]

export function JobForm({ hiringManagers, initialValues }: JobFormProps) {
  const router = useRouter()
  const isEditing = !!initialValues?.id

  const [form, setForm] = useState({
    title: initialValues?.title ?? '',
    department: initialValues?.department ?? '',
    location: initialValues?.location ?? '',
    employment_type: initialValues?.employment_type ?? 'full_time',
    description: initialValues?.description ?? '',
    requirements: initialValues?.requirements ?? '',
    screening_criteria: initialValues?.screening_criteria ?? '',
    status: initialValues?.status ?? 'open',
    hiring_manager_id: initialValues?.hiring_manager_id ?? '',
  })

  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [saving, setSaving] = useState(false)

  function validate(): boolean {
    const e: Partial<typeof form> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.description.trim()) e.description = 'Description is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const payload = {
        ...form,
        hiring_manager_id: form.hiring_manager_id || null,
      }

      const url = isEditing ? `/api/jobs/${initialValues!.id}` : '/api/jobs'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save job')
      }

      const saved = await res.json()
      router.push(`/dashboard/jobs/${saved.id}`)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const hmOptions = [
    { value: '', label: 'Unassigned' },
    ...hiringManagers.map((hm) => ({
      value: hm.id,
      label: `${hm.full_name} (${hm.email})`,
    })),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Details</h2>

        <Input
          id="title"
          label="Job title *"
          placeholder="Senior Software Engineer"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={errors.title}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="department"
            label="Department"
            placeholder="Engineering"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Input
            id="location"
            label="Location"
            placeholder="Dallas, TX"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="employment_type"
            label="Employment type"
            options={EMPLOYMENT_OPTIONS}
            value={form.employment_type}
            onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
          />
          <Select
            id="status"
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
        </div>

        <Select
          id="hiring_manager_id"
          label="Assign Hiring Manager"
          options={hmOptions}
          value={form.hiring_manager_id}
          onChange={(e) => setForm({ ...form, hiring_manager_id: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Content</h2>

        <Textarea
          id="description"
          label="Job description *"
          placeholder="Describe the role, responsibilities, and team..."
          rows={6}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          error={errors.description}
        />

        <Textarea
          id="requirements"
          label="Requirements"
          placeholder="List the skills, experience, and qualifications required..."
          rows={5}
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
        />
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Screening Criteria</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tell the AI exactly what to look for when evaluating CVs. The more specific, the better.
            </p>
          </div>
        </div>

        <Textarea
          id="screening_criteria"
          label="Custom screening criteria"
          hint="Examples: 'Must have 5+ years of React experience. Prefer candidates with startup backgrounds. Strong communication skills are critical. PhD preferred but not required.'"
          placeholder="Describe what the AI should prioritize when scoring candidates for this role..."
          rows={5}
          value={form.screening_criteria}
          onChange={(e) => setForm({ ...form, screening_criteria: e.target.value })}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Post Job'}
        </Button>
      </div>
    </form>
  )
}
