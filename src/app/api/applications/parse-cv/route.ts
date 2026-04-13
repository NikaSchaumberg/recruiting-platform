export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const anthropic = new Anthropic()

const EXTRACT_PROMPT = `Extract candidate information from this CV/Resume PDF. Return ONLY valid JSON (no markdown, no code fences, no explanation) matching this exact schema:

{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "address": "",
  "city": "",
  "state": "",
  "zip": "",
  "dateOfBirth": "",
  "skills": [],
  "workExperience": [
    {
      "employer": "",
      "jobTitle": "",
      "tasks": "",
      "phone": "",
      "address": "",
      "city": "",
      "state": "",
      "startDate": "",
      "endDate": "",
      "mayContact": true
    }
  ],
  "education": [
    {
      "school": "",
      "country": "",
      "degree": "",
      "major": "",
      "graduationDate": ""
    }
  ]
}

Rules:
- Leave any field as empty string "" if not found
- skills: extract all skills, technologies, tools, and competencies mentioned
- startDate / endDate: use "MM/YYYY" format; use "Present" for current positions
- graduationDate: use "MM/YYYY" format
- dateOfBirth: use "YYYY-MM-DD" format if found, otherwise ""
- tasks: extract responsibilities and achievements for each role as a bulleted list; if the CV already has bullet points (•, -, *, numbers), convert them to lines starting with "• "; if no bullet points exist, write 2-4 key responsibilities each on its own line starting with "• "; leave "" if nothing found
- mayContact: true by default`

const EMPTY_RESULT = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', state: '', zip: '', dateOfBirth: '',
  skills: [] as string[], workExperience: [], education: [],
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const cvFile = formData.get('cv') as File | null

    if (!cvFile || cvFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }
    if (cvFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    // Convert PDF to base64 for Claude's native PDF support
    const buffer = Buffer.from(await cvFile.arrayBuffer())
    const base64Data = buffer.toString('base64')

    const userMessage: MessageParam = {
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
        } as unknown as Anthropic.TextBlockParam,
        { type: 'text', text: EXTRACT_PROMPT },
      ],
    }

    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [userMessage],
      })
    } catch (apiErr) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      console.error('[parse-cv] Anthropic API error:', msg)
      if (msg.includes('401') || msg.includes('authentication') || msg.includes('invalid x-api-key')) {
        return NextResponse.json(
          { error: 'AI authentication failed — add a valid ANTHROPIC_API_KEY to .env.local and restart the server' },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: `AI error: ${msg}` }, { status: 500 })
    }

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    let extracted: unknown = EMPTY_RESULT
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      extracted = JSON.parse(cleaned)
    } catch {
      console.warn('[parse-cv] JSON parse failed. Raw response:', raw.substring(0, 300))
      extracted = EMPTY_RESULT
    }

    return NextResponse.json({ data: extracted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[parse-cv] Unexpected error:', msg)
    return NextResponse.json({ error: `CV analysis failed: ${msg}` }, { status: 500 })
  }
}
