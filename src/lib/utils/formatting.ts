export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatEmploymentType(type: string): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
  }
  return map[type] ?? type
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-700 bg-green-100'
  if (score >= 50) return 'text-amber-700 bg-amber-100'
  return 'text-red-700 bg-red-100'
}

export function getRecommendationLabel(rec: string): string {
  const map: Record<string, string> = {
    strong_yes: 'Strong Yes',
    yes: 'Yes',
    maybe: 'Maybe',
    no: 'No',
  }
  return map[rec] ?? rec
}

export function getRecommendationColor(rec: string): string {
  const map: Record<string, string> = {
    strong_yes: 'text-green-700 bg-green-100',
    yes: 'text-green-600 bg-green-50',
    maybe: 'text-amber-700 bg-amber-100',
    no: 'text-red-700 bg-red-100',
  }
  return map[rec] ?? 'text-gray-700 bg-gray-100'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'New',
    screening: 'Screening',
    screened: 'Screened',
    shortlisted: 'Shortlisted',
    interview_invited: 'Interview Invited',
    interview: 'Interview',
    first_interview: '1st Interview',
    second_interview: '2nd Interview',
    offer: 'Offer',
    rejected: 'Rejected',
    hired: 'Hired',
  }
  return map[status] ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-gray-600 bg-gray-100',
    screening: 'text-blue-600 bg-blue-100',
    screened: 'text-indigo-600 bg-indigo-100',
    shortlisted: 'text-purple-600 bg-purple-100',
    interview_invited: 'text-yellow-700 bg-yellow-100',
    interview: 'text-yellow-700 bg-yellow-100',
    first_interview: 'text-amber-700 bg-amber-100',
    second_interview: 'text-orange-600 bg-orange-100',
    offer: 'text-brand-700 bg-brand-100',
    rejected: 'text-red-600 bg-red-100',
    hired: 'text-green-700 bg-green-100',
  }
  return map[status] ?? 'text-gray-600 bg-gray-100'
}

/** Maps a DB status to its pipeline stage column key */
export function getPipelineStage(status: string): string {
  const map: Record<string, string> = {
    pending: 'new',
    screening: 'new',
    screened: 'new',
    shortlisted: 'new',
    interview_invited: 'first_interview',
    interview: 'second_interview',
    first_interview: 'first_interview',
    second_interview: 'second_interview',
    offer: 'offer',
    rejected: 'rejected',
    hired: 'hired',
  }
  return map[status] ?? 'new'
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
