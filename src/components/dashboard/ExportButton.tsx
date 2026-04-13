'use client'

interface ExportApp {
  applicant_name: string
  applicant_email: string
  phone: string | null
  status: string
  submitted_at: string
  ai_screening: { score: number; recommendation: string } | null
}

interface ExportButtonProps {
  jobTitle: string
  applications: ExportApp[]
}

export function ExportButton({ jobTitle, applications }: ExportButtonProps) {
  function handleExport() {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'AI Score', 'Recommendation', 'Applied Date']
    const rows = applications.map((app) => [
      app.applicant_name,
      app.applicant_email,
      app.phone ?? '',
      app.status,
      app.ai_screening?.score?.toString() ?? '',
      app.ai_screening?.recommendation ?? '',
      new Date(app.submitted_at).toLocaleDateString(),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${jobTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-candidates.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </button>
  )
}
