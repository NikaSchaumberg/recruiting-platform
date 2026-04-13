-- Add scheduling support to candidate_emails
ALTER TABLE public.candidate_emails
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS send_at timestamptz;

-- Index for querying scheduled emails efficiently
CREATE INDEX IF NOT EXISTS candidate_emails_status_send_at
  ON public.candidate_emails (status, send_at)
  WHERE status = 'scheduled';
