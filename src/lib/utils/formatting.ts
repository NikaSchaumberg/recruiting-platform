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

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-gray-600 bg-gray-100',
    screening: 'text-blue-600 bg-blue-100',
    screened: 'text-indigo-600 bg-indigo-100',
    shortlisted: 'text-purple-600 bg-purple-100',
    interview: 'text-yellow-700 bg-yellow-100',
    offer: 'text-orange-700 bg-orange-100',
    rejected: 'text-red-600 bg-red-100',
    hired: 'text-green-700 bg-green-100',
  }
  return map[status] ?? 'text-gray-600 bg-gray-100'
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
