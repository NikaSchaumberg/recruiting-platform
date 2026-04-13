-- Add inbound email support to candidate_emails

ALTER TABLE public.candidate_emails
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS from_name  text,
  -- Graph message ID for idempotent processing / deduplication
  ADD COLUMN IF NOT EXISTS graph_message_id text;

-- Unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS candidate_emails_graph_message_id
  ON public.candidate_emails (graph_message_id)
  WHERE graph_message_id IS NOT NULL;

-- Allow 'received' as a valid status for inbound emails
-- (existing check only covers 'sent', 'scheduled')
ALTER TABLE public.candidate_emails
  DROP CONSTRAINT IF EXISTS candidate_emails_status_check;

ALTER TABLE public.candidate_emails
  ADD CONSTRAINT candidate_emails_status_check
  CHECK (status IN ('sent', 'scheduled', 'failed', 'received'));
