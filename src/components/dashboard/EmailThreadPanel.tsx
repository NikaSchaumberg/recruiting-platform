'use client'

import { useState } from 'react'
import { EmailCompose } from './EmailCompose'
import { EmailHistory } from './EmailHistory'
import type { CandidateEmail } from '@/types/database'

interface EmailThreadPanelProps {
  emails: CandidateEmail[]
  applicationId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  hrName: string
}

/**
 * Client wrapper that lets EmailHistory's "Reply" button pre-fill and open
 * the EmailCompose modal — coordinating two sibling components whose parent
 * is a server component.
 */
export function EmailThreadPanel({
  emails,
  applicationId,
  candidateName,
  candidateEmail,
  jobTitle,
  hrName,
}: EmailThreadPanelProps) {
  const [pendingSubject, setPendingSubject] = useState<string | null>(null)

  return (
    <>
      <EmailCompose
        applicationId={applicationId}
        candidateName={candidateName}
        candidateEmail={candidateEmail}
        jobTitle={jobTitle}
        hrName={hrName}
        pendingSubject={pendingSubject}
        onPendingClear={() => setPendingSubject(null)}
      />
      <EmailHistory
        emails={emails}
        onReply={(subject) => setPendingSubject(subject)}
      />
    </>
  )
}
