export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const offer = body.offer ?? null
  if (!offer) return NextResponse.json({ error: 'offer data required' }, { status: 400 })

  try {
    const pdfBytes = await generateOfferPdf(offer)
    return new Response(Buffer.from(pdfBytes), {
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
  const page = pdfDoc.addPage(PageSizes.Letter)
  const { width, height } = page.getSize()

  const timesRoman     = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const helvetica      = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 72          // 1 inch
  const contentWidth = width - margin * 2

  const black    = rgb(0, 0, 0)
  const darkGray = rgb(0.2, 0.2, 0.2)
  const midGray  = rgb(0.45, 0.45, 0.45)
  const lightGray = rgb(0.8, 0.8, 0.8)
  const caramel  = rgb(0.769, 0.659, 0.510)   // #C4A882

  let y = height - margin

  // ── HEADER ────────────────────────────────────────────────────────────
  // Top rule
  page.drawRectangle({ x: margin, y: y - 2, width: contentWidth, height: 2, color: caramel })
  y -= 22

  // Company name
  page.drawText('EXXIR LLC', {
    x: margin, y,
    size: 16, font: helveticaBold, color: black,
  })

  // Date right-aligned
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const dateW = helvetica.widthOfTextAtSize(today, 10)
  page.drawText(today, {
    x: width - margin - dateW, y: y + 2,
    size: 10, font: helvetica, color: midGray,
  })

  y -= 6
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray })
  y -= 28

  // ── GREETING ──────────────────────────────────────────────────────────
  page.drawText(`Dear ${offer.candidate_name},`, {
    x: margin, y,
    size: 11, font: timesRoman, color: black,
  })
  y -= 20

  // Opening paragraph
  const reportingTo = offer.reporting_manager ? `, reporting to ${offer.reporting_manager}` : ''
  const openPara =
    `We are pleased to offer you the position of ${offer.job_title} with Exxir LLC${reportingTo}. ` +
    `This offer is subject to the terms and conditions described below.`
  const openLines = wrapText(openPara, timesRoman, 11, contentWidth)
  for (const line of openLines) {
    page.drawText(line, { x: margin, y, size: 11, font: timesRoman, color: black })
    y -= 16
  }
  y -= 12

  // ── SECTION: POSITION DETAILS ─────────────────────────────────────────
  y = drawSectionHeader(page, 'Position Details', margin, y, contentWidth, helveticaBold, caramel)

  y = drawField(page, 'Job Title', offer.job_title, margin, y, timesRoman, helveticaBold, darkGray, midGray)

  const startLabel = offer.start_date
    ? new Date(offer.start_date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '____________'
  y = drawField(page, 'Beginning Date', startLabel, margin, y, timesRoman, helveticaBold, darkGray, midGray)
  y = drawField(page, 'Employment Classification', 'At-Will', margin, y, timesRoman, helveticaBold, darkGray, midGray)

  y -= 8

  // ── SECTION: COMPENSATION ─────────────────────────────────────────────
  y = drawSectionHeader(page, 'Compensation', margin, y, contentWidth, helveticaBold, caramel)

  const salaryText = offer.salary
    ? `$${Number(offer.salary).toLocaleString()} annually`
    : '____________'
  y = drawField(page, 'Base Salary', salaryText, margin, y, timesRoman, helveticaBold, darkGray, midGray)
  y -= 8

  // ── SECTION: BENEFITS ─────────────────────────────────────────────────
  y = drawSectionHeader(page, 'Benefits', margin, y, contentWidth, helveticaBold, caramel)

  const benefitsText = offer.benefits ||
    'You will receive two weeks (10 days) paid vacation and five (5) sick days per calendar year, ' +
    'both of which activate after completing 90 days of employment. Medical benefits are provided ' +
    'through Blue Cross Blue Shield of Texas and become effective after your first full month of employment.'
  const benefitLines = wrapText(benefitsText, timesRoman, 11, contentWidth)
  for (const line of benefitLines) {
    page.drawText(line, { x: margin, y, size: 11, font: timesRoman, color: black })
    y -= 16
  }
  y -= 12

  // ── SECTION: WORK PRODUCT & IP ────────────────────────────────────────
  y = drawSectionHeader(page, 'Work Product and Intellectual Property', margin, y, contentWidth, helveticaBold, caramel)

  const ipText =
    'All work product, inventions, discoveries, and developments created, conceived, or reduced to ' +
    'practice by you during your employment that relate to the business of Exxir LLC shall be the ' +
    'sole and exclusive property of Exxir LLC. You agree to promptly disclose and assign all such ' +
    'work product to the Company.'
  const ipLines = wrapText(ipText, timesRoman, 11, contentWidth)
  for (const line of ipLines) {
    page.drawText(line, { x: margin, y, size: 11, font: timesRoman, color: black })
    y -= 16
  }
  y -= 12

  // ── SECTION: CONFIDENTIAL INFORMATION ────────────────────────────────
  y = drawSectionHeader(page, 'Confidential Information', margin, y, contentWidth, helveticaBold, caramel)

  const confText =
    'During and after your employment, you agree to maintain in strict confidence all proprietary ' +
    'and confidential information belonging to Exxir LLC, including but not limited to trade secrets, ' +
    'client information, business strategies, and financial data. You agree not to disclose such ' +
    'information to any third party without prior written consent from the Company.'
  const confLines = wrapText(confText, timesRoman, 11, contentWidth)
  for (const line of confLines) {
    page.drawText(line, { x: margin, y, size: 11, font: timesRoman, color: black })
    y -= 16
  }
  y -= 12

  // ── BACKGROUND CHECK NOTE ─────────────────────────────────────────────
  const bgText = 'Please note that your employment is contingent upon successfully passing a background check.'
  const bgLines = wrapText(bgText, timesRoman, 10, contentWidth)
  for (const line of bgLines) {
    page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: midGray })
    y -= 15
  }
  y -= 12

  if (offer.notes) {
    y = drawSectionHeader(page, 'Additional Notes', margin, y, contentWidth, helveticaBold, caramel)
    const noteLines = wrapText(offer.notes, timesRoman, 11, contentWidth)
    for (const line of noteLines) {
      page.drawText(line, { x: margin, y, size: 11, font: timesRoman, color: black })
      y -= 16
    }
    y -= 12
  }

  // ── CLOSING ───────────────────────────────────────────────────────────
  const closingText =
    'We hope you will find the above terms satisfactory so that we may proceed towards welcoming you to the team. ' +
    'Please sign below to indicate your acceptance of this offer.'
  const closingLines = wrapText(closingText, timesRoman, 11, contentWidth)
  for (const line of closingLines) {
    page.drawText(line, { x: margin, y, size: 11, font: timesRoman, color: black })
    y -= 16
  }
  y -= 24

  // ── SIGNATURES ────────────────────────────────────────────────────────
  const sigY = y
  const sigWidth = 180
  const col2X = margin + sigWidth + 60

  // Company side
  page.drawText('For Exxir LLC:', { x: margin, y: sigY, size: 10, font: timesRomanBold, color: darkGray })
  page.drawLine({ start: { x: margin, y: sigY - 30 }, end: { x: margin + sigWidth, y: sigY - 30 }, thickness: 0.5, color: lightGray })
  page.drawText(offer.hr_name || 'Authorized Signatory', { x: margin, y: sigY - 44, size: 9, font: timesRoman, color: darkGray })
  page.drawText('Title: _______________', { x: margin, y: sigY - 58, size: 9, font: timesRoman, color: midGray })
  page.drawText('Date: ________________', { x: margin, y: sigY - 72, size: 9, font: timesRoman, color: midGray })

  // Employee side
  page.drawText('Employee Acceptance:', { x: col2X, y: sigY, size: 10, font: timesRomanBold, color: darkGray })
  page.drawLine({ start: { x: col2X, y: sigY - 30 }, end: { x: col2X + sigWidth, y: sigY - 30 }, thickness: 0.5, color: lightGray })
  page.drawText(offer.candidate_name, { x: col2X, y: sigY - 44, size: 9, font: timesRoman, color: darkGray })
  page.drawText('Date: ________________', { x: col2X, y: sigY - 58, size: 9, font: timesRoman, color: midGray })

  // ── FOOTER ────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: margin, y: 42 }, end: { x: width - margin, y: 42 }, thickness: 0.4, color: lightGray })
  page.drawText('Jungle Fitness Studio  ·  200 N Bishop Ave Suite 106, Dallas, TX 75208', {
    x: margin, y: 28,
    size: 8, font: helvetica, color: midGray,
  })

  return pdfDoc.save()
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function drawSectionHeader(
  page: ReturnType<PDFDocument['addPage']>,
  title: string,
  margin: number,
  y: number,
  contentWidth: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color: ReturnType<typeof rgb>
): number {
  page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 18, color: rgb(0.97, 0.97, 0.97) })
  page.drawRectangle({ x: margin, y: y - 4, width: 3, height: 18, color: color })
  page.drawText(title.toUpperCase(), {
    x: margin + 10, y: y + 1,
    size: 8, font, color: rgb(0.3, 0.3, 0.3),
  })
  return y - 28
}

function drawField(
  page: ReturnType<PDFDocument['addPage']>,
  label: string,
  value: string,
  margin: number,
  y: number,
  bodyFont: Awaited<ReturnType<PDFDocument['embedFont']>>,
  labelFont: Awaited<ReturnType<PDFDocument['embedFont']>>,
  valueColor: ReturnType<typeof rgb>,
  labelColor: ReturnType<typeof rgb>
): number {
  page.drawText(label + ':', { x: margin, y, size: 10, font: labelFont, color: labelColor })
  page.drawText(value, { x: margin + 160, y, size: 11, font: bodyFont, color: valueColor })
  return y - 18
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
