-- ============================================================
-- 1. Mark inbound emails as read/unread
-- ============================================================

ALTER TABLE public.candidate_emails
  ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;

-- Existing outbound emails are already "read" from the team's perspective
UPDATE public.candidate_emails SET read = true WHERE direction = 'outbound' OR direction IS NULL;

-- ============================================================
-- 2. Interviews table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.interviews (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    uuid        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  scheduled_at      timestamptz NOT NULL,
  duration_minutes  int         NOT NULL DEFAULT 60,
  interview_type    text        NOT NULL DEFAULT 'video'
                                CHECK (interview_type IN ('video', 'phone', 'in_person')),
  location          text,
  notes             text,
  status            text        NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_interviews" ON public.interviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "hm_read_write_interviews" ON public.interviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id AND j.hiring_manager_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS interviews_application_id ON public.interviews (application_id);
CREATE INDEX IF NOT EXISTS interviews_scheduled_at   ON public.interviews (scheduled_at);
