export type TemplateId =
  | 'first_interview_invitation'
  | 'second_interview_invitation'
  | 'application_received'
  | 'rejection'
  | 'offer_letter'
  | 'contract'
  | 'custom'

// Legacy alias used by EmailCompose
export type LegacyTemplateId =
  | 'interview_invitation'
  | 'application_received'
  | 'rejection'
  | 'offer_extended'
  | 'custom'

export interface EmailTemplate {
  id: string
  label: string
  subject: string
  body: string
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'first_interview_invitation',
    label: 'Interview Invitation (1st)',
    subject: 'Interview Invitation – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Thank you for applying for the [job_title] position at Exxir Capital. We were impressed with your background and would like to invite you for a first interview.

Please reply to this email to schedule a convenient time.

Best regards,
[hr_name]
Exxir Capital`,
  },
  {
    id: 'second_interview_invitation',
    label: 'Interview Invitation (2nd)',
    subject: '2nd Interview Invitation – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Thank you for attending your first interview. We were impressed and would like to invite you for a second interview to discuss your experience in more depth.

Please reply to this email to schedule a convenient time.

Best regards,
[hr_name]
Exxir Capital`,
  },
  {
    id: 'application_received',
    label: 'Application Received',
    subject: 'Application Received – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Thank you for applying for the [job_title] position at Exxir Capital. We have received your application and our team will review it shortly.

Best regards,
Exxir Capital`,
  },
  {
    id: 'rejection',
    label: 'Rejection',
    subject: 'Your Application – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Thank you for your interest in the [job_title] position at Exxir Capital. After careful consideration, we have decided to move forward with other candidates at this time.

We appreciate your time and wish you the best in your job search.

Best regards,
[hr_name]
Exxir Capital`,
  },
  {
    id: 'offer_letter',
    label: 'Offer Letter',
    subject: 'Job Offer – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

We are delighted to offer you the position of [job_title] at Exxir Capital, starting [start_date] with a compensation of [salary].

Please review the attached offer letter for full details.

Best regards,
[hr_name]
Exxir Capital`,
  },
  {
    id: 'contract',
    label: 'Contract',
    subject: 'Employment Contract – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Please find attached your employment contract for the [job_title] position at Exxir Capital. Kindly review, sign, and return it at your earliest convenience.

Best regards,
[hr_name]
Exxir Capital`,
  },
  {
    id: 'custom',
    label: 'Custom (blank)',
    subject: '',
    body: '',
  },
]

// Legacy aliases for EmailCompose component backward compatibility
export const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  interview_invitation: 'first_interview_invitation',
  offer_extended: 'offer_letter',
}

export type TemplateVars = {
  candidate_name?: string
  job_title?: string
  hr_name?: string
  start_date?: string
  salary?: string
  company_name?: string
}

export function fillTemplate(text: string, vars: TemplateVars): string {
  return text
    .replace(/\[candidate_name\]/g, vars.candidate_name ?? '')
    .replace(/\[job_title\]/g, vars.job_title ?? '')
    .replace(/\[hr_name\]/g, vars.hr_name ?? '')
    .replace(/\[start_date\]/g, vars.start_date ?? '')
    .replace(/\[salary\]/g, vars.salary ?? '')
    .replace(/\[company_name\]/g, vars.company_name ?? 'Exxir Capital')
}
