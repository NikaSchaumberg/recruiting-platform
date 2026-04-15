import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGraphEmail, cleanEnv } from '@/lib/email/graphEmail'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()

  // Fetch target user's email
  const { data: targetUser, error: fetchErr } = await adminClient.auth.admin.getUserById(id)
  if (fetchErr || !targetUser.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const targetEmail = targetUser.user.email
  const targetName = targetUser.user.user_metadata?.full_name ?? targetEmail

  // Generate a recovery token via admin client (uses service role — no email sending by Supabase)
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: targetEmail,
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[reset-password] generateLink failed:', linkErr)
    return NextResponse.json({ error: linkErr?.message ?? 'Failed to generate reset link' }, { status: 500 })
  }

  const token = linkData.properties.hashed_token

  // Point directly to update-password — no redirect chain, token verified there.
  // Note: & encoded as &amp; in href to satisfy HTML spec (required by strict email clients).
  const resetLink = `${siteUrl}/auth/update-password?token_hash=${token}&type=recovery`
  const resetLinkHtmlSafe = `${siteUrl}/auth/update-password?token_hash=${token}&amp;type=recovery`

  const emailBody = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9f7f4;margin:0;padding:32px 0;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e8e2d8;padding:40px 36px;">
    <h2 style="font-size:18px;font-weight:700;color:#1a1a1a;margin:0 0 8px 0;">Reset your password</h2>
    <p style="font-size:14px;color:#6b7280;margin:0 0 24px 0;">Exxir Recruiting Platform</p>
    <p style="font-size:14px;color:#374151;margin:0 0 24px 0;">
      Hi ${targetName},<br><br>
      An admin has requested a password reset for your account.
      Click the button below to set a new password.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td>
          <a href="${resetLinkHtmlSafe}"
             style="background-color:#C4A882;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:#9ca3af;margin:0 0 12px 0;">
      This link expires in 24 hours. If you did not expect this email, you can ignore it.
    </p>
    <p style="font-size:12px;color:#6b7280;margin:0;">
      If the button does not work, copy and paste this URL into your browser:
    </p>
    <p style="font-size:12px;color:#374151;margin:4px 0 0 0;word-break:break-all;">
      ${resetLink}
    </p>
  </div>
</body>
</html>`

  try {
    await sendGraphEmail({
      to: targetEmail,
      toName: targetName,
      subject: 'Reset your Exxir Recruiting Platform password',
      body: emailBody,
      html: true,
      from: cleanEnv(process.env.GRAPH_SENDER_EMAIL),
    })
  } catch (emailErr) {
    console.error('[reset-password] Graph email failed:', emailErr)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
