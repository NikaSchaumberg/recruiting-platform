export type TemplateId =
  | 'interview_invitation'
  | 'application_received'
  | 'rejection'
  | 'offer_extended'
  | 'custom'

export interface EmailTemplate {
  id: TemplateId
  label: string
  subject: string
  body: string
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'interview_invitation',
    label: 'Interview Invitation',
    subject: 'Interview Invitation – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Thank you for applying for the [job_title] position at Exxir Capital. We were impressed with your background and would like to invite you for an interview.

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

Thank you for applying for the [job_title] position at Exxir Capital. We have received your application and will review it shortly.

Best regards,
Exxir Capital`,
  },
  {
    id: 'rejection',
    label: 'Rejection',
    subject: 'Your Application – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

Thank you for your interest in the [job_title] position at Exxir Capital. After careful consideration, we have decided to move forward with other candidates.

We appreciate your time and wish you the best of luck in your job search.

Best regards,
[hr_name]
Exxir Capital`,
  },
  {
    id: 'offer_extended',
    label: 'Offer Extended',
    subject: 'Job Offer – [job_title] at Exxir Capital',
    body: `Dear [candidate_name],

We are pleased to offer you the [job_title] position at Exxir Capital. Please reply to this email to discuss the details.

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

export function fillTemplate(
  text: string,
  vars: { candidate_name: string; job_title: string; hr_name: string }
): string {
  return text
    .replace(/\[candidate_name\]/g, vars.candidate_name)
    .replace(/\[job_title\]/g, vars.job_title)
    .replace(/\[hr_name\]/g, vars.hr_name)
}
