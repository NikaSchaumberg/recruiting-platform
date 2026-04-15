ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS interviewer_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS graph_event_id text;
