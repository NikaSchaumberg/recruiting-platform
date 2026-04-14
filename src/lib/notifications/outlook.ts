import { cleanEnv, getGraphToken } from '@/lib/email/graphEmail'

interface OutlookNotificationParams {
  recipientEmail: string
  recipientName: string
  applicantName: string
  applicantEmail: string
  jobTitle: string
  jobDepartment: string
  score: number
  recommendation: string
  summary: string
  strengths: string[]
  gaps: string[]
  dashboardUrl: string
}

function formatRecommendation(rec: string): string {
  const map: Record<string, string> = {
    strong_yes: 'Strong Yes ✅',
    yes: 'Yes ✅',
    maybe: 'Maybe ⚠️',
    no: 'No ❌',
  }
  return map[rec] ?? rec
}

function getScoreBadgeColor(score: number): string {
  if (score >= 75) return '#16a34a'
  if (score >= 50) return '#d97706'
  return '#dc2626'
}

export async function sendOutlookNotification(params: OutlookNotificationParams): Promise<void> {
  // Internal notifications (screening results → HR + hiring managers) are sent
  // from nschaumberg@exxircapital.com. Fall back to GRAPH_SENDER_EMAIL if the
  // internal sender isn't configured.
  const senderEmail =
    cleanEnv(process.env.GRAPH_INTERNAL_SENDER_EMAIL) ??
    cleanEnv(process.env.GRAPH_SENDER_EMAIL)
  if (!senderEmail) {
    console.warn('[Outlook] GRAPH_INTERNAL_SENDER_EMAIL / GRAPH_SENDER_EMAIL not set — skipping notification')
    return
  }

  const requiredEnv = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET']
  if (requiredEnv.some((k) => !process.env[k])) {
    console.warn('[Outlook] Azure credentials not fully configured — skipping notification')
    return
  }

  const scoreColor = getScoreBadgeColor(params.score)

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
  <div style="background: #4f46e5; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">🤖 New Candidate Screened</h1>
    <p style="color: #c7d2fe; margin: 4px 0 0;">AI Recruiting Platform</p>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280; width: 140px;">Candidate</td>
        <td style="padding: 8px 0; font-weight: 600;">${params.applicantName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Email</td>
        <td style="padding: 8px 0;">${params.applicantEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Position</td>
        <td style="padding: 8px 0; font-weight: 600;">${params.jobTitle}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Department</td>
        <td style="padding: 8px 0;">${params.jobDepartment}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">AI Score</td>
        <td style="padding: 8px 0;">
          <span style="background: ${scoreColor}; color: white; padding: 2px 10px; border-radius: 9999px; font-weight: 700; font-size: 14px;">
            ${params.score}/100
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Recommendation</td>
        <td style="padding: 8px 0; font-weight: 600;">${formatRecommendation(params.recommendation)}</td>
      </tr>
    </table>

    <h3 style="color: #1f2937; margin-bottom: 8px;">Summary</h3>
    <p style="margin: 0 0 20px; line-height: 1.6;">${params.summary}</p>

    <h3 style="color: #16a34a; margin-bottom: 8px;">Strengths</h3>
    <ul style="margin: 0 0 20px; padding-left: 20px; line-height: 1.8;">
      ${params.strengths.map((s) => `<li>${s}</li>`).join('')}
    </ul>

    ${
      params.gaps.length > 0
        ? `<h3 style="color: #d97706; margin-bottom: 8px;">Gaps / Concerns</h3>
    <ul style="margin: 0 0 20px; padding-left: 20px; line-height: 1.8;">
      ${params.gaps.map((g) => `<li>${g}</li>`).join('')}
    </ul>`
        : ''
    }

    <a href="${params.dashboardUrl}"
       style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">
      View Full Profile in Dashboard
    </a>
  </div>
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
    Sent automatically by your AI Recruiting Platform
  </p>
</body>
</html>`

  try {
    const token = await getGraphToken()

    const emailPayload = {
      message: {
        subject: `New Applicant Screened: ${params.applicantName} for ${params.jobTitle} (Score: ${params.score}/100)`,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: params.recipientEmail,
              name: params.recipientName,
            },
          },
        ],
      },
      saveToSentItems: false,
    }

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`[Outlook] sendMail failed: ${res.status} ${text}`)
    }
  } catch (err) {
    console.error('[Outlook] Notification error:', err)
  }
}
