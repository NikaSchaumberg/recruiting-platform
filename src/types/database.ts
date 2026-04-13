export type UserRole = 'admin' | 'hiring_manager'

export type JobStatus = 'open' | 'closed' | 'draft'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship'
export type ApplicationStatus =
  | 'pending'
  | 'screening'
  | 'screened'
  | 'shortlisted'
  | 'interview_invited'
  | 'interview'
  | 'first_interview'
  | 'second_interview'
  | 'offer'
  | 'rejected'
  | 'hired'

export type OfferStatus = 'draft' | 'sent' | 'signed'
export type ContractStatus = 'draft' | 'sent' | 'signed'

export interface CandidateEmail {
  id: string
  application_id: string
  subject: string
  body: string
  sent_by: string | null
  sent_by_name: string
  sent_at: string
  status?: 'sent' | 'scheduled' | 'failed' | 'received'
  send_at?: string | null
  direction?: 'inbound' | 'outbound'
  from_email?: string | null
  from_name?: string | null
  graph_message_id?: string | null
}

export interface CandidateMessage {
  id: string
  application_id: string
  sender_id: string | null
  sender_name: string
  text: string
  sent_at: string
}
export type AIRecommendation = 'strong_yes' | 'yes' | 'maybe' | 'no'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  teams_webhook_url?: string | null
}

export interface Job {
  id: string
  title: string
  department: string
  location: string
  employment_type: EmploymentType
  description: string
  requirements: string
  screening_criteria: string
  status: JobStatus
  hiring_manager_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joined
  hiring_manager?: Profile
  applications?: Application[]
  _count?: { applications: number }
}

export interface Application {
  id: string
  job_id: string
  applicant_name: string
  applicant_email: string
  phone: string | null
  linkedin_url: string | null
  cover_letter: string | null
  cv_path: string
  cv_filename: string
  status: ApplicationStatus
  submitted_at: string
  hr_notes: string | null
  application_data: Record<string, unknown> | null
  // joined
  job?: Job
  ai_screening?: AIScreening
}

export interface AIScreening {
  id: string
  application_id: string
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
  recommendation: AIRecommendation
  raw_response: string | null
  screened_at: string
}

export interface EmailTemplate {
  id: string
  template_key: string | null
  name: string
  subject: string
  body: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  application_id: string
  candidate_name: string
  job_title: string
  department: string
  location: string
  start_date: string | null
  salary: number | null
  employment_type: string
  reporting_manager: string
  benefits: string
  notes: string
  hr_name: string
  status: OfferStatus
  created_at: string
  sent_at: string | null
}

export interface Contract {
  id: string
  application_id: string
  offer_id: string | null
  candidate_name: string
  job_title: string
  start_date: string | null
  salary: number | null
  employment_type: string
  reporting_manager: string
  additional_terms: string
  hr_name: string
  status: ContractStatus
  created_at: string
  sent_at: string | null
}
