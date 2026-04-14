export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContractPdf } from '@/lib/pdf/contractPdf'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const contract = body.contract ?? null
  if (!contract) return NextResponse.json({ error: 'contract data required' }, { status: 400 })

  try {
    const pdfBytes = await generateContractPdf(contract)
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${contract.candidate_name.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[contract/pdf] PDF generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
