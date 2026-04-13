-- ============================================================
-- 1. Add interview_invited to applications status check
-- ============================================================

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'pending', 'screening', 'screened', 'shortlisted',
    'interview_invited', 'interview', 'offer', 'rejected', 'hired'
  ));

-- ============================================================
-- 2. Candidate emails log
-- ============================================================

CREATE TABLE public.candidate_emails (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  subject       text        NOT NULL,
  body          text        NOT NULL,
  sent_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_by_name  text        NOT NULL DEFAULT '',
  sent_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_candidate_emails" ON public.candidate_emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "hm_read_candidate_emails" ON public.candidate_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id AND j.hiring_manager_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Candidate messages (internal comms log)
-- ============================================================

CREATE TABLE public.candidate_messages (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name   text        NOT NULL,
  text          text        NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_candidate_messages" ON public.candidate_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "hm_read_write_candidate_messages" ON public.candidate_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id AND j.hiring_manager_id = auth.uid()
    )
  );
