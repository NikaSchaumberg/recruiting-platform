interface TeamsNotificationParams {
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

function getScoreColor(score: number): string {
  if (score >= 75) return 'good'
  if (score >= 50) return 'warning'
  return 'attention'
}

function formatRecommendation(rec: string): string {
  const map: Record<string, string> = {
    strong_yes: '✅ Strong Yes',
    yes: '✅ Yes',
    maybe: '⚠️ Maybe',
    no: '❌ No',
  }
  return map[rec] ?? rec
}

export async function sendTeamsNotification(params: TeamsNotificationParams): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('[Teams] TEAMS_WEBHOOK_URL not set — skipping notification')
    return
  }

  const scoreColor = getScoreColor(params.score)

  const payload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: '🤖 New Candidate Screened',
              weight: 'Bolder',
              size: 'Large',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Candidate', value: params.applicantName },
                { title: 'Email', value: params.applicantEmail },
                { title: 'Position', value: params.jobTitle },
                { title: 'Department', value: params.jobDepartment },
                { title: 'AI Score', value: `${params.score}/100` },
                { title: 'Recommendation', value: formatRecommendation(params.recommendation) },
              ],
            },
            {
              type: 'TextBlock',
              text: 'Summary',
              weight: 'Bolder',
              spacing: 'Medium',
            },
            {
              type: 'TextBlock',
              text: params.summary,
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: 'Strengths',
              weight: 'Bolder',
              spacing: 'Medium',
              color: 'Good',
            },
            {
              type: 'TextBlock',
              text: params.strengths.map((s) => `• ${s}`).join('\n'),
              wrap: true,
              color: 'Good',
            },
            ...(params.gaps.length > 0
              ? [
                  {
                    type: 'TextBlock',
                    text: 'Gaps / Concerns',
                    weight: 'Bolder',
                    spacing: 'Medium',
                    color: scoreColor === 'attention' ? 'Attention' : 'Warning',
                  },
                  {
                    type: 'TextBlock',
                    text: params.gaps.map((g) => `• ${g}`).join('\n'),
                    wrap: true,
                    color: scoreColor === 'attention' ? 'Attention' : 'Warning',
                  },
                ]
              : []),
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View in Dashboard',
              url: params.dashboardUrl,
            },
          ],
        },
      },
    ],
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Teams] Webhook failed: ${res.status} ${text}`)
  }
}
