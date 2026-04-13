'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailTemplate } from '@/types/database'

interface Props {
  templates: EmailTemplate[]
}

const VARIABLES = ['[candidate_name]', '[job_title]', '[hr_name]', '[start_date]', '[salary]', '[company_name]']

const C = { caramel: '#C4A882', bg: '#faf6ef' }

export function EmailTemplateEditor({ templates: initialTemplates }: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // New template form
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [creating, setCreating] = useState(false)

  function startEdit(tpl: EmailTemplate) {
    setEditingId(tpl.id)
    setEditName(tpl.name)
    setEditSubject(tpl.subject)
    setEditBody(tpl.body)
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setSaveError(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, subject: editSubject, body: editBody }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { template } = await res.json()
      setTemplates(prev => prev.map(t => t.id === id ? template : t))
      setEditingId(null)
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    const res = await fetch(`/api/email-templates/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTemplates(prev => prev.filter(t => t.id !== id))
      router.refresh()
    }
  }

  async function createTemplate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, subject: newSubject, body: newBody }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { template } = await res.json()
      setTemplates(prev => [...prev, template])
      setShowNew(false)
      setNewName('')
      setNewSubject('')
      setNewBody('')
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setCreating(false)
    }
  }

  const systemTemplates = templates.filter(t => t.is_system)
  const customTemplates  = templates.filter(t => !t.is_system)

  return (
    <div className="space-y-8">

      {/* Variables reference */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Available Variables</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map(v => (
            <code key={v} className="text-xs px-2 py-1 rounded font-mono text-brand-700 border border-brand-200"
              style={{ backgroundColor: '#fdf6ec' }}>
              {v}
            </code>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-2.5">These will be replaced with real values when sending emails.</p>
      </div>

      {/* System templates */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">System Templates</h2>
        <div className="space-y-3">
          {systemTemplates.map(tpl => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              isEditing={editingId === tpl.id}
              editName={editName}
              editSubject={editSubject}
              editBody={editBody}
              saving={saving}
              saveError={saveError}
              onEdit={() => startEdit(tpl)}
              onCancel={cancelEdit}
              onSave={() => saveEdit(tpl.id)}
              onChangeName={setEditName}
              onChangeSubject={setEditSubject}
              onChangeBody={setEditBody}
            />
          ))}
        </div>
      </section>

      {/* Custom templates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Custom Templates</h2>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg"
            style={{ backgroundColor: C.caramel }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Template
          </button>
        </div>

        {customTemplates.length === 0 && !showNew && (
          <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center">
            <p className="text-sm text-stone-400">No custom templates yet.</p>
            <button onClick={() => setShowNew(true)} className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
              Create your first custom template
            </button>
          </div>
        )}

        <div className="space-y-3">
          {customTemplates.map(tpl => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              isEditing={editingId === tpl.id}
              editName={editName}
              editSubject={editSubject}
              editBody={editBody}
              saving={saving}
              saveError={saveError}
              onEdit={() => startEdit(tpl)}
              onCancel={cancelEdit}
              onSave={() => saveEdit(tpl.id)}
              onDelete={() => deleteTemplate(tpl.id, tpl.name)}
              onChangeName={setEditName}
              onChangeSubject={setEditSubject}
              onChangeBody={setEditBody}
            />
          ))}

          {/* New template form */}
          {showNew && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100" style={{ backgroundColor: C.bg }}>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">New Custom Template</p>
              </div>
              <div className="p-5 space-y-4">
                <TemplateFields
                  name={newName} subject={newSubject} body={newBody}
                  onChangeName={setNewName} onChangeSubject={setNewSubject} onChangeBody={setNewBody}
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowNew(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={createTemplate} disabled={creating || !newName.trim()}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
                    style={{ backgroundColor: C.caramel }}>
                    {creating ? 'Creating…' : 'Create Template'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface CardProps {
  tpl: EmailTemplate
  isEditing: boolean
  editName: string
  editSubject: string
  editBody: string
  saving: boolean
  saveError: string | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete?: () => void
  onChangeName: (v: string) => void
  onChangeSubject: (v: string) => void
  onChangeBody: (v: string) => void
}

function TemplateCard({ tpl, isEditing, editName, editSubject, editBody, saving, saveError,
  onEdit, onCancel, onSave, onDelete, onChangeName, onChangeSubject, onChangeBody }: CardProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, #fdf9f4, #fff)' }}>
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
          {tpl.is_system && (
            <span className="text-xs px-1.5 py-0.5 rounded text-stone-400 bg-stone-100">System</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1">
              Delete
            </button>
          )}
          {!isEditing && (
            <button onClick={onEdit}
              className="text-xs font-medium px-3 py-1.5 border border-stone-200 rounded-lg text-gray-600 hover:bg-stone-50 transition-colors">
              Edit
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="p-5 space-y-4">
          <TemplateFields
            name={editName} subject={editSubject} body={editBody}
            onChangeName={onChangeName} onChangeSubject={onChangeSubject} onChangeBody={onChangeBody}
          />
          {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#C4A882' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-3">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Subject</p>
            <p className="text-sm text-gray-700">{tpl.subject || <span className="text-stone-300 italic">No subject</span>}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">Body</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4 leading-relaxed">
              {tpl.body || <span className="text-stone-300 italic">No body</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplateFields({ name, subject, body, onChangeName, onChangeSubject, onChangeBody }: {
  name: string; subject: string; body: string
  onChangeName: (v: string) => void; onChangeSubject: (v: string) => void; onChangeBody: (v: string) => void
}) {
  const cls = 'w-full text-sm border border-stone-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300'
  return (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
        <input value={name} onChange={e => onChangeName(e.target.value)} className={cls} placeholder="e.g. Follow-up Email" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Subject Line</label>
        <input value={subject} onChange={e => onChangeSubject(e.target.value)} className={cls}
          placeholder="e.g. Re: Your application for [job_title]" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Body</label>
        <textarea value={body} onChange={e => onChangeBody(e.target.value)} className={`${cls} resize-y`} rows={8}
          placeholder="Dear [candidate_name],&#10;&#10;..." style={{ fontFamily: 'inherit', lineHeight: 1.6 }} />
      </div>
    </>
  )
}
