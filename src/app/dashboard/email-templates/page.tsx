import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { EmailTemplateEditor } from '@/components/dashboard/EmailTemplateEditor'
import { EMAIL_TEMPLATES } from '@/lib/email/templates'
import type { EmailTemplate } from '@/types/database'

export default async function EmailTemplatesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard/jobs')

  // Fetch from DB; fall back to seeded code templates if table doesn't exist yet
  let templates: EmailTemplate[] = []
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('email_templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: true })

    if (!error && data) {
      templates = data as EmailTemplate[]
    }
  } catch {
    // Table doesn't exist yet (migration not run) — use code defaults
  }

  // If DB is empty, show code-based defaults as read-only hints
  if (templates.length === 0) {
    templates = EMAIL_TEMPLATES
      .filter(t => t.id !== 'custom')
      .map((t, i) => ({
        id: `code-${i}`,
        template_key: t.id,
        name: t.label,
        subject: t.subject,
        body: t.body,
        is_system: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-serif-display" style={{ fontSize: '1.6rem', color: '#1A1A1A' }}>
          Email Templates
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage the email templates used when updating candidate statuses.
        </p>
      </div>

      {templates.some(t => t.id.startsWith('code-')) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-700">
            <strong>Migration not applied.</strong> Run <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">supabase/migrations/007_offers_contracts.sql</code> in your Supabase SQL Editor to enable template editing.
          </p>
        </div>
      )}

      <EmailTemplateEditor templates={templates} />
    </div>
  )
}
