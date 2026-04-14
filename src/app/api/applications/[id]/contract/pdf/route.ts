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

export interface ContractData {
  candidate_name: string
  job_title: string
  department?: string
  location?: string
  start_date?: string | null
  salary?: number | null
  employment_type?: string
  reporting_manager?: string
  benefits?: string
  additional_terms?: string
  hr_name?: string
}

export async function generateContractPdf(contract: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  const timesRoman     = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const helvetica      = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageW = PageSizes.Letter[0]
  const pageH = PageSizes.Letter[1]
  const margin = 72
  const contentW = pageW - margin * 2

  const black    = rgb(0, 0, 0)
  const darkGray = rgb(0.15, 0.15, 0.15)
  const midGray  = rgb(0.45, 0.45, 0.45)
  const lightGray = rgb(0.8, 0.8, 0.8)
  const caramel  = rgb(0.769, 0.659, 0.510)
  const bgLight  = rgb(0.97, 0.97, 0.97)

  const startLabel = contract.start_date
    ? new Date(contract.start_date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '____________'

  const salaryText = contract.salary
    ? `$${Number(contract.salary).toLocaleString()} annually`
    : '____________'

  // ── PAGE 1 ────────────────────────────────────────────────────────────
  let page = pdfDoc.addPage(PageSizes.Letter)
  let y = pageH - margin

  // Header rule
  page.drawRectangle({ x: margin, y: y - 2, width: contentW, height: 2, color: caramel })
  y -= 22

  page.drawText('EXXIR LLC', { x: margin, y, size: 16, font: helveticaBold, color: black })

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const dW = helvetica.widthOfTextAtSize(today, 10)
  page.drawText(today, { x: pageW - margin - dW, y: y + 2, size: 10, font: helvetica, color: midGray })

  y -= 6
  page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.5, color: lightGray })
  y -= 20

  page.drawText('EMPLOYMENT AGREEMENT', { x: margin, y, size: 14, font: timesRomanBold, color: darkGray })
  y -= 28

  // ── HEADER TABLE ──────────────────────────────────────────────────────
  const tableRows: [string, string][] = [
    ['Company',        'Exxir LLC'],
    ['Employee',       contract.candidate_name],
    ['Effective Date', startLabel],
    ['Position',       contract.job_title],
    ['Reports To',     contract.reporting_manager || '____________'],
    ['Work Location',  contract.location || '____________'],
    ['Governing Law',  'State of Texas'],
  ]

  const rowH = 20
  const col1W = 130
  for (let i = 0; i < tableRows.length; i++) {
    const [label, value] = tableRows[i]
    const bg = i % 2 === 0 ? bgLight : rgb(1, 1, 1)
    page.drawRectangle({ x: margin, y: y - rowH + 6, width: contentW, height: rowH, color: bg })
    page.drawText(label, { x: margin + 8, y: y - 6, size: 9, font: helveticaBold, color: midGray })
    page.drawText(value, { x: margin + col1W, y: y - 6, size: 10, font: timesRoman, color: darkGray })
    y -= rowH
  }
  y -= 16

  // ── SECTIONS ──────────────────────────────────────────────────────────
  const sections: { title: string; body: string }[] = [
    {
      title: '1. Position & Duties',
      body:
        `Employee is hired for the position of ${contract.job_title}${contract.department ? ` in the ${contract.department} department` : ''}. ` +
        `Employee agrees to devote their full professional time, attention, and energies to the performance of duties for Exxir LLC. ` +
        `Employee shall comply with all Company policies, rules, and regulations as established from time to time.`,
    },
    {
      title: '2. Employment Classification',
      body:
        'This is an at-will employment arrangement. Either party may terminate the employment relationship at any time, with or without cause or notice, ' +
        'subject to the notice provisions in Section 9 of this Agreement. This Agreement does not constitute a guarantee of employment for any specific period. ' +
        'Employee\'s classification for purposes of the Fair Labor Standards Act (FLSA) will be determined by the Company based on the duties performed.',
    },
    {
      title: '3. Compensation & Benefits',
      body:
        `Base Salary: Employee will receive a base salary of ${salaryText}, payable in accordance with the Company's standard payroll schedule.\n\n` +
        `Paid Time Off: Employee will receive two weeks (10 days) of paid vacation and five (5) sick days per calendar year, both activating after 90 days of employment.\n\n` +
        `Benefits: Medical benefits are provided through Blue Cross Blue Shield of Texas, effective after Employee\'s first full month of employment.\n\n` +
        (contract.benefits ? `Additional Benefits: ${contract.benefits}\n\n` : '') +
        `Expenses: The Company will reimburse Employee for all reasonable and necessary business expenses incurred in the performance of duties, subject to Company expense reimbursement policies.`,
    },
    {
      title: '4. Work Product & Intellectual Property',
      body:
        'All inventions, discoveries, developments, improvements, and other work product conceived, created, or reduced to practice by Employee during employment, ' +
        'whether or not during working hours, that relate to the actual or anticipated business of the Company or result from use of Company resources, ' +
        'shall be the sole and exclusive property of Exxir LLC ("Work Product"). Employee hereby assigns to the Company all right, title, and interest in and to all Work Product, ' +
        'including all intellectual property rights therein.',
    },
    {
      title: '5. Confidential Information',
      body:
        'During and after employment, Employee agrees to hold in strict confidence and not to disclose to any third party any Confidential Information of the Company. ' +
        '"Confidential Information" means any non-public information relating to the Company\'s business, including but not limited to trade secrets, client lists, ' +
        'pricing strategies, financial data, software, and business plans. Employee agrees to use Confidential Information solely for the benefit of the Company.',
    },
    {
      title: '6. Non-Competition',
      body:
        'For a period of twelve (12) months following the termination of employment for any reason, Employee agrees not to directly or indirectly engage in, ' +
        'own, manage, operate, or provide services to any business that competes with Exxir LLC within the Dallas–Fort Worth metropolitan area. ' +
        'This restriction applies to roles that are substantially similar to the position held at the Company.',
    },
    {
      title: '7. Non-Solicitation',
      body:
        'For a period of twelve (12) months following termination of employment, Employee agrees not to directly or indirectly: ' +
        '(a) solicit, recruit, or induce any employee of the Company to leave their employment; or ' +
        '(b) solicit, divert, or take away any client, customer, or business partner of the Company with whom Employee had material contact during their employment.',
    },
    {
      title: '8. Non-Disparagement',
      body:
        'Employee agrees not to make any false, misleading, or disparaging statements — whether oral or written — about Exxir LLC, its officers, directors, employees, ' +
        'products, or services, during or after employment. The Company agrees to the same with respect to Employee following separation.',
    },
    {
      title: '9. Termination',
      body:
        'Either party may terminate this Agreement at any time upon fourteen (14) days\' written notice to the other party. ' +
        'The Company may terminate Employee immediately and without notice for Cause, which includes but is not limited to: material breach of this Agreement, ' +
        'gross misconduct, fraud, theft, or willful failure to perform assigned duties. ' +
        'Upon termination, Employee shall immediately return all Company property and certify destruction of any Confidential Information.',
    },
    {
      title: '10. Dispute Resolution & Arbitration',
      body:
        'Any dispute arising from or relating to this Agreement or Employee\'s employment shall be resolved by binding arbitration administered by JAMS ' +
        'in Dallas, Texas, under its Employment Arbitration Rules. The arbitrator\'s decision shall be final and binding. ' +
        'Each party shall bear its own legal fees unless the arbitrator determines otherwise. ' +
        'Nothing in this section prevents either party from seeking injunctive relief in a court of competent jurisdiction.',
    },
    {
      title: '11. General Provisions',
      body:
        'This Agreement constitutes the entire agreement between the parties with respect to the subject matter herein and supersedes all prior discussions and agreements. ' +
        'This Agreement shall be governed by the laws of the State of Texas. If any provision is held unenforceable, the remaining provisions shall remain in full force. ' +
        'This Agreement may not be amended except in writing signed by both parties.',
    },
  ]

  // Render sections across pages
  for (const section of sections) {
    const titleLines = [`${section.title}`]
    const bodyLines = wrapText(section.body, timesRoman, 10, contentW)
    const neededH = 24 + (titleLines.length * 16) + (bodyLines.length * 14) + 12

    if (y - neededH < margin + 60) {
      addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
      page = pdfDoc.addPage(PageSizes.Letter)
      y = pageH - margin
    }

    // Section title bar
    page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 18, color: bgLight })
    page.drawRectangle({ x: margin, y: y - 4, width: 3, height: 18, color: caramel })
    page.drawText(section.title.toUpperCase(), {
      x: margin + 10, y: y + 1,
      size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3),
    })
    y -= 24

    for (const line of bodyLines) {
      if (y < margin + 60) {
        addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
        page = pdfDoc.addPage(PageSizes.Letter)
        y = pageH - margin
      }
      page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
      y -= 14
    }
    y -= 10
  }

  // Additional terms
  if (contract.additional_terms) {
    if (y - 80 < margin + 60) {
      addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
      page = pdfDoc.addPage(PageSizes.Letter)
      y = pageH - margin
    }
    page.drawRectangle({ x: margin, y: y - 4, width: contentW, height: 18, color: bgLight })
    page.drawRectangle({ x: margin, y: y - 4, width: 3, height: 18, color: caramel })
    page.drawText('ADDITIONAL TERMS', {
      x: margin + 10, y: y + 1,
      size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3),
    })
    y -= 24
    const termLines = wrapText(contract.additional_terms, timesRoman, 10, contentW)
    for (const line of termLines) {
      if (y < margin + 60) {
        addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
        page = pdfDoc.addPage(PageSizes.Letter)
        y = pageH - margin
      }
      page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
      y -= 14
    }
    y -= 10
  }

  // ── SIGNATURES ────────────────────────────────────────────────────────
  if (y - 120 < margin + 60) {
    addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
    page = pdfDoc.addPage(PageSizes.Letter)
    y = pageH - margin
  }

  y -= 10
  page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.5, color: lightGray })
  y -= 20

  page.drawText('IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.', {
    x: margin, y,
    size: 10, font: timesRoman, color: darkGray,
  })
  y -= 32

  const sigW = 180
  const col2 = margin + sigW + 60

  page.drawText('For Exxir LLC:', { x: margin, y, size: 10, font: timesRomanBold, color: darkGray })
  page.drawText('Employee:', { x: col2, y, size: 10, font: timesRomanBold, color: darkGray })
  y -= 36

  page.drawLine({ start: { x: margin, y }, end: { x: margin + sigW, y }, thickness: 0.5, color: lightGray })
  page.drawLine({ start: { x: col2, y }, end: { x: col2 + sigW, y }, thickness: 0.5, color: lightGray })
  y -= 14
  page.drawText(contract.hr_name || 'Authorized Signatory', { x: margin, y, size: 9, font: timesRoman, color: darkGray })
  page.drawText(contract.candidate_name, { x: col2, y, size: 9, font: timesRoman, color: darkGray })
  y -= 14
  page.drawText('Date: ________________', { x: margin, y, size: 9, font: timesRoman, color: midGray })
  page.drawText('Date: ________________', { x: col2, y, size: 9, font: timesRoman, color: midGray })

  // ── EXHIBIT A ─────────────────────────────────────────────────────────
  addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
  page = pdfDoc.addPage(PageSizes.Letter)
  y = pageH - margin

  page.drawRectangle({ x: margin, y: y - 2, width: contentW, height: 2, color: caramel })
  y -= 28
  page.drawText('EXHIBIT A — JOB DESCRIPTION', { x: margin, y, size: 13, font: timesRomanBold, color: darkGray })
  y -= 24

  const exhibitARows: [string, string][] = [
    ['Position Title', contract.job_title],
    ['Department', contract.department || '____________'],
    ['Reports To', contract.reporting_manager || '____________'],
    ['Location', contract.location || '____________'],
    ['Employment Type', contract.employment_type ? fmtType(contract.employment_type) : 'Full-Time'],
  ]
  for (let i = 0; i < exhibitARows.length; i++) {
    const [label, value] = exhibitARows[i]
    const bg = i % 2 === 0 ? bgLight : rgb(1, 1, 1)
    page.drawRectangle({ x: margin, y: y - 14, width: contentW, height: 20, color: bg })
    page.drawText(label, { x: margin + 8, y: y - 6, size: 9, font: helveticaBold, color: midGray })
    page.drawText(value, { x: margin + col1W, y: y - 6, size: 10, font: timesRoman, color: darkGray })
    y -= 20
  }
  y -= 16

  const aHeader = (t: string) => {
    page.drawText(t, { x: margin, y, size: 11, font: timesRomanBold, color: darkGray })
    y -= 18
  }
  const aBody = (t: string) => {
    const lines = wrapText(t, timesRoman, 10, contentW)
    for (const l of lines) { page.drawText(l, { x: margin, y, size: 10, font: timesRoman, color: darkGray }); y -= 14 }
    y -= 6
  }

  aHeader('Position Summary')
  aBody(
    `The ${contract.job_title} is responsible for contributing to the mission and goals of Exxir LLC. ` +
    `This role requires strong professional judgment, effective communication, and a commitment to excellence.`
  )

  aHeader('Key Responsibilities')
  aBody(
    '• Perform all duties associated with the role in a professional and timely manner.\n' +
    '• Collaborate with team members and leadership to achieve Company objectives.\n' +
    '• Maintain accurate records and documentation as required.\n' +
    '• Adhere to all Company policies, procedures, and applicable regulations.\n' +
    '• Undertake additional responsibilities as assigned by management.'
  )

  aHeader('Qualifications')
  aBody(
    '• Relevant education or equivalent professional experience in the field.\n' +
    '• Strong interpersonal and communication skills.\n' +
    '• Ability to work independently and as part of a collaborative team.\n' +
    '• Proficiency in relevant tools and technologies.\n' +
    '• Demonstrated commitment to quality and continuous improvement.'
  )

  // ── EXHIBIT B ─────────────────────────────────────────────────────────
  addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())
  page = pdfDoc.addPage(PageSizes.Letter)
  y = pageH - margin

  page.drawRectangle({ x: margin, y: y - 2, width: contentW, height: 2, color: caramel })
  y -= 28
  page.drawText('EXHIBIT B — PRIOR INVENTIONS', { x: margin, y, size: 13, font: timesRomanBold, color: darkGray })
  y -= 24

  const exBText =
    'Employee hereby discloses and identifies below all inventions, original works of authorship, developments, concepts, improvements, designs, ' +
    'discoveries, ideas, trademarks or trade secrets ("Inventions") that were created by Employee prior to the commencement of employment with Exxir LLC, ' +
    'that Employee owns or in which Employee has an interest, and that relate in any way to the Company\'s business.\n\n' +
    'If no Prior Inventions are listed below, Employee represents that there are no such Inventions at this time.'
  const exBLines = wrapText(exBText, timesRoman, 10, contentW)
  for (const line of exBLines) {
    page.drawText(line, { x: margin, y, size: 10, font: timesRoman, color: darkGray })
    y -= 14
  }
  y -= 20

  // Prior inventions list area
  for (let i = 0; i < 4; i++) {
    page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) })
    y -= 22
  }
  y -= 16

  page.drawText('☐  No Prior Inventions to disclose.', { x: margin, y, size: 10, font: timesRoman, color: darkGray })
  y -= 30

  page.drawLine({ start: { x: margin, y }, end: { x: margin + sigW, y }, thickness: 0.5, color: lightGray })
  y -= 14
  page.drawText(contract.candidate_name, { x: margin, y, size: 9, font: timesRoman, color: darkGray })
  y -= 14
  page.drawText('Date: ________________', { x: margin, y, size: 9, font: timesRoman, color: midGray })

  addFooter(page, margin, pageW, helvetica, midGray, lightGray, pdfDoc.getPageCount())

  return pdfDoc.save()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addFooter(
  page: ReturnType<PDFDocument['addPage']>,
  margin: number,
  pageW: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color: ReturnType<typeof rgb>,
  lineColor: ReturnType<typeof rgb>,
  pageNum: number
) {
  page.drawLine({ start: { x: margin, y: 42 }, end: { x: pageW - margin, y: 42 }, thickness: 0.4, color: lineColor })
  page.drawText('Jungle Fitness Studio  ·  200 N Bishop Ave Suite 106, Dallas, TX 75208', {
    x: margin, y: 28, size: 8, font, color,
  })
  const pLabel = `Page ${pageNum}`
  const pW = font.widthOfTextAtSize(pLabel, 8)
  page.drawText(pLabel, { x: pageW - margin - pW, y: 28, size: 8, font, color })
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

function fmtType(type: string): string {
  const m: Record<string, string> = { full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', internship: 'Internship' }
  return m[type] ?? type
}
