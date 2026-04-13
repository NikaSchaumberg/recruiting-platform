-- ============================================================
-- 1. Extend application status check for Phase 2 pipeline
-- ============================================================

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'pending', 'screening', 'screened', 'shortlisted',
    'interview_invited', 'interview',
    'first_interview', 'second_interview',
    'offer', 'rejected', 'hired'
  ));

-- ============================================================
-- 2. Email templates
-- ============================================================

CREATE TABLE public.email_templates (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key text        UNIQUE,
  name         text        NOT NULL,
  subject      text        NOT NULL DEFAULT '',
  body         text        NOT NULL DEFAULT '',
  is_system    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

INSERT INTO public.email_templates (template_key, name, subject, body, is_system) VALUES
(
  'application_received',
  'Application Received',
  'Application Received – [job_title] at Exxir Capital',
  E'Dear [candidate_name],\n\nThank you for applying for the [job_title] position at Exxir Capital. We have received your application and our team will review it shortly.\n\nBest regards,\nExxir Capital',
  true
),
(
  'first_interview_invitation',
  'Interview Invitation (1st)',
  'Interview Invitation – [job_title] at Exxir Capital',
  E'Dear [candidate_name],\n\nThank you for applying for the [job_title] position at Exxir Capital. We were impressed with your background and would like to invite you for a first interview.\n\nPlease reply to this email to schedule a convenient time.\n\nBest regards,\n[hr_name]\nExxir Capital',
  true
),
(
  'second_interview_invitation',
  'Interview Invitation (2nd)',
  '2nd Interview Invitation – [job_title] at Exxir Capital',
  E'Dear [candidate_name],\n\nThank you for attending your first interview. We were impressed and would like to invite you for a second interview to discuss your experience in more depth.\n\nPlease reply to this email to schedule a convenient time.\n\nBest regards,\n[hr_name]\nExxir Capital',
  true
),
(
  'offer_letter',
  'Offer Letter',
  'Job Offer – [job_title] at Exxir Capital',
  E'Dear [candidate_name],\n\nWe are delighted to offer you the position of [job_title] at Exxir Capital, starting [start_date] with a compensation of [salary].\n\nPlease review the attached offer letter for full details.\n\nBest regards,\n[hr_name]\nExxir Capital',
  true
),
(
  'rejection',
  'Rejection',
  'Your Application – [job_title] at Exxir Capital',
  E'Dear [candidate_name],\n\nThank you for your interest in the [job_title] position at Exxir Capital. After careful consideration, we have decided to move forward with other candidates at this time.\n\nWe appreciate your time and wish you the best in your job search.\n\nBest regards,\n[hr_name]\nExxir Capital',
  true
),
(
  'contract',
  'Contract',
  'Employment Contract – [job_title] at Exxir Capital',
  E'Dear [candidate_name],\n\nPlease find attached your employment contract for the [job_title] position at Exxir Capital. Kindly review, sign, and return it at your earliest convenience.\n\nBest regards,\n[hr_name]\nExxir Capital',
  true
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything; all authenticated users can read
CREATE POLICY "admin_all_email_templates" ON public.email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "authenticated_read_email_templates" ON public.email_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. Offers
-- ============================================================

CREATE TABLE public.offers (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    uuid        NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  candidate_name    text        NOT NULL DEFAULT '',
  job_title         text        NOT NULL DEFAULT '',
  department        text        NOT NULL DEFAULT '',
  location          text        NOT NULL DEFAULT '',
  start_date        date,
  salary            numeric,
  employment_type   text        NOT NULL DEFAULT 'full_time',
  reporting_manager text        NOT NULL DEFAULT '',
  benefits          text        NOT NULL DEFAULT '',
  notes             text        NOT NULL DEFAULT '',
  hr_name           text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'signed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_offers" ON public.offers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "hm_read_offers" ON public.offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id AND j.hiring_manager_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Contracts
-- ============================================================

CREATE TABLE public.contracts (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    uuid        NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  offer_id          uuid        REFERENCES public.offers(id) ON DELETE SET NULL,
  candidate_name    text        NOT NULL DEFAULT '',
  job_title         text        NOT NULL DEFAULT '',
  start_date        date,
  salary            numeric,
  employment_type   text        NOT NULL DEFAULT 'full_time',
  reporting_manager text        NOT NULL DEFAULT '',
  additional_terms  text        NOT NULL DEFAULT '',
  hr_name           text        NOT NULL DEFAULT '',
  status            text        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'sent', 'signed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_contracts" ON public.contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "hm_read_contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id AND j.hiring_manager_id = auth.uid()
    )
  );
