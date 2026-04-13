-- Add missing columns to applications table
alter table public.applications
  add column if not exists hr_notes       text,
  add column if not exists application_data jsonb;
