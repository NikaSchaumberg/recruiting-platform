export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const body = await request.json()

  // Use passed offer data (live preview) or fetch saved
  const offer = body.offer ?? null
  if (!offer) return NextResponse.json({ error: 'offer data required' }, { status: 400 })

  try {
    const pdfBytes = await generateOfferPdf(offer)
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="offer-letter-${offer.candidate_name.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[offer/pdf] PDF generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

export async function generateOfferPdf(offer: {
  candidate_name: string
  job_title: string
  department?: string
  location?: string
  start_date?: string | null
  salary?: number | null
  employment_type?: string
  reporting_manager?: string
  benefits?: string
  notes?: string
  hr_name?: string
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage(PageSizes.A4)
  const { width, height } = page.getSize()

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 60
  const contentWidth = width - margin * 2

  // Colours
  const black = rgb(0, 0, 0)
  const caramel = rgb(0.769, 0.659, 0.510)   // #C4A882
  const darkGray = rgb(0.2, 0.2, 0.2)
  const midGray = rgb(0.45, 0.45, 0.45)
  const lightGray = rgb(0.85, 0.85, 0.85)

  let y = height - margin

  // ── Header band ─────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.102, 0.102, 0.102) })

  page.drawText('EXXIR CAPITAL', {
    x: margin,
    y: height - 42,
    size: 20,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  })
  page.drawText('OFFER OF EMPLOYMENT', {
    x: margin,
    y: height - 64,
    size: 9,
    font: helvetica,
    color: caramel,
    characterSpacing: 2,
  })

  // Date top right
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const dateWidth = helvetica.widthOfTextAtSize(today, 9)
  page.drawText(today, {
    x: width - margin - dateWidth,
    y: height - 52,
    size: 9,
    font: helvetica,
    color: rgb(0.7, 0.7, 0.7),
  })

  y = height - 115

  // ── Candidate name ───────────────────────────────────────────────────
  page.drawText(offer.candidate_name, {
    x: margin,
    y,
    size: 15,
    font: timesRomanBold,
    color: darkGray,
  })
  y -= 18

  if (offer.job_title) {
    page.drawText(`Re: Offer of Employment — ${offer.job_title}`, {
      x: margin,
      y,
      size: 10,
      font: timesRoman,
      color: midGray,
    })
    y -= 24
  }

  // ── Divider ──────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray })
  y -= 20

  // ── Opening paragraph ────────────────────────────────────────────────
  const greeting = `Dear ${offer.candidate_name},`
  page.drawText(greeting, { x: margin, y, size: 11, font: timesRoman, color: darkGray })
  y -= 18

  const openingLines = [
    `We are pleased to extend this offer of employment to you for the position of`,
    `${offer.job_title}${offer.department ? ` in the ${offer.department} department` : ''}${offer.location ? `, based in ${offer.location}` : ''}.`,
    ``,
    `Please review the terms of this offer below.`,
  ]
  for (const line of openingLines) {
    page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
    y -= 15
  }
  y -= 10

  // ── Details section ──────────────────────────────────────────────────
  const drawField = (label: string, value: string) => {
    if (!value) return
    page.drawText(label.toUpperCase(), {
      x: margin,
      y,
      size: 7.5,
      font: helveticaBold,
      color: caramel,
      characterSpacing: 1,
    })
    y -= 13
    page.drawText(value, { x: margin, y, size: 10.5, font: timesRoman, color: darkGray })
    y -= 20
  }

  const drawSectionHeader = (title: string) => {
    y -= 6
    page.drawRectangle({ x: margin, y: y - 2, width: contentWidth, height: 20, color: rgb(0.976, 0.973, 0.965) })
    page.drawText(title.toUpperCase(), {
      x: margin + 8,
      y: y + 3,
      size: 8,
      font: helveticaBold,
      color: midGray,
      characterSpacing: 1.5,
    })
    y -= 22
  }

  drawSectionHeader('Employment Details')

  drawField('Position', offer.job_title)
  if (offer.department) drawField('Department', offer.department)
  if (offer.location) drawField('Location', offer.location)
  if (offer.start_date) drawField('Start Date', new Date(offer.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
  if (offer.salary) drawField('Compensation', `$${Number(offer.salary).toLocaleString()} per year`)
  if (offer.employment_type) drawField('Employment Type', formatEmploymentType(offer.employment_type))
  if (offer.reporting_manager) drawField('Reporting Manager', offer.reporting_manager)

  if (offer.benefits) {
    drawSectionHeader('Benefits')
    // Wrap long benefits text
    const benefitLines = wrapText(offer.benefits, timesRoman, 10, contentWidth)
    for (const line of benefitLines) {
      page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
      y -= 14
    }
    y -= 6
  }

  if (offer.notes) {
    drawSectionHeader('Additional Notes')
    const noteLines = wrapText(offer.notes, timesRoman, 10, contentWidth)
    for (const line of noteLines) {
      page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
      y -= 14
    }
    y -= 6
  }

  // ── Closing ──────────────────────────────────────────────────────────
  y -= 10
  const closingLines = [
    'We look forward to welcoming you to the Exxir Capital team. Please sign and',
    'return this letter to confirm your acceptance of this offer.',
  ]
  for (const line of closingLines) {
    page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
    y -= 14
  }

  y -= 30

  // ── Signature block ──────────────────────────────────────────────────
  page.drawText('Sincerely,', { x: margin, y, size: 10, font: timesRoman, color: darkGray })
  y -= 40

  page.drawLine({ start: { x: margin, y }, end: { x: margin + 160, y }, thickness: 0.5, color: lightGray })
  y -= 14
  page.drawText(offer.hr_name || 'HR Representative', { x: margin, y, size: 10, font: timesRomanBold, color: darkGray })
  y -= 14
  page.drawText('Exxir Capital', { x: margin, y, size: 9, font: timesRoman, color: midGray })

  // Candidate acceptance block
  const acceptX = margin + 240
  let acceptY = y + 54
  page.drawText('Candidate Acceptance', {
    x: acceptX,
    y: acceptY,
    size: 8,
    font: helveticaBold,
    color: midGray,
    characterSpacing: 0.5,
  })
  acceptY -= 30
  page.drawLine({ start: { x: acceptX, y: acceptY }, end: { x: acceptX + 160, y: acceptY }, thickness: 0.5, color: lightGray })
  acceptY -= 14
  page.drawText('Signature & Date', { x: acceptX, y: acceptY, size: 8, font: helvetica, color: rgb(0.65, 0.65, 0.65) })

  // ── Footer ───────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y: 38 }, end: { x: width - margin, y: 38 }, thickness: 0.4, color: rgb(0.85, 0.85, 0.85) })
  page.drawText('Exxir Capital  ·  Confidential  ·  This offer is contingent on satisfactory background verification.', {
    x: margin,
    y: 24,
    size: 7,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  })

  return pdfDoc.save()
}

function formatEmploymentType(type: string): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
  }
  return map[type] ?? type
}

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ')
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
        if (current) lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    lines.push(current)
  }
  return lines
}
