import Anthropic from '@anthropic-ai/sdk'
import type { AIRecommendation } from '@/types/database'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ScreeningResult {
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
  recommendation: AIRecommendation
  raw_response: string
}

export async function screenCandidate(params: {
  jobTitle: string
  jobDescription: string
  requirements: string
  screeningCriteria: string
  cvText: string
  applicantName: string
}): Promise<ScreeningResult> {
  const { jobTitle, jobDescription, requirements, screeningCriteria, cvText, applicantName } = params

  const systemPrompt = `You are an expert recruiter and talent acquisition specialist. Your task is to objectively evaluate a candidate's CV against a job posting and produce a structured screening report. Be thorough, fair, and specific. Always respond with valid JSON only.`

  const userPrompt = `Please evaluate the following candidate for the "${jobTitle}" position.

## Job Description
${jobDescription}

## Requirements
${requirements}

## Screening Criteria (custom criteria set by the hiring team)
${screeningCriteria || 'Use the job description and requirements to determine fit.'}

## Candidate: ${applicantName}
### CV Content
${cvText}

---

Evaluate this candidate and respond with a JSON object matching this exact structure:
{
  "score": <integer 0-100, overall fit score>,
  "summary": "<2-3 sentence summary of the candidate and their fit for this role>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "gaps": ["<specific gap or concern 1>", "<specific gap or concern 2>", ...],
  "recommendation": "<one of: strong_yes, yes, maybe, no>"
}

Scoring guide:
- 85-100: Exceptional fit, exceeds requirements
- 70-84: Strong fit, meets most requirements
- 50-69: Moderate fit, meets some requirements
- 25-49: Weak fit, significant gaps
- 0-24: Poor fit, does not meet requirements

Recommendation guide:
- strong_yes: Score 80+, highly recommend advancing
- yes: Score 65-79, recommend advancing
- maybe: Score 45-64, requires further evaluation
- no: Score <45, do not advance

Respond with JSON only. No markdown, no explanation.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const rawResponse = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed: Omit<ScreeningResult, 'raw_response'>
  try {
    // Strip potential markdown code fences
    const clean = rawResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    // Fallback if JSON parsing fails
    parsed = {
      score: 50,
      summary: 'Automated screening could not parse the CV. Manual review required.',
      strengths: [],
      gaps: ['CV parsing failed — manual review required'],
      recommendation: 'maybe',
    }
  }

  // Clamp score to valid range
  const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 50)))

  return {
    score,
    summary: parsed.summary ?? '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    recommendation: (['strong_yes', 'yes', 'maybe', 'no'] as AIRecommendation[]).includes(
      parsed.recommendation
    )
      ? parsed.recommendation
      : 'maybe',
    raw_response: rawResponse,
  }
}
