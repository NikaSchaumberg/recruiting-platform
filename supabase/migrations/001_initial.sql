-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  email      text not null unique,
  role       text not null default 'hiring_manager'
               check (role in ('admin', 'hiring_manager')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'hiring_manager')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- JOBS
-- ============================================================
create table public.jobs (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  department          text not null default '',
  location            text not null default '',
  employment_type     text not null default 'full_time'
                        check (employment_type in ('full_time', 'part_time', 'contract', 'internship')),
  description         text not null default '',
  requirements        text not null default '',
  screening_criteria  text not null default '',
  status              text not null default 'open'
                        check (status in ('open', 'closed', 'draft')),
  hiring_manager_id   uuid references public.profiles(id) on delete set null,
  created_by          uuid not null references public.profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.update_updated_at();

-- ============================================================
-- APPLICATIONS
-- ============================================================
create table public.applications (
  id               uuid primary key default uuid_generate_v4(),
  job_id           uuid not null references public.jobs(id) on delete cascade,
  applicant_name   text not null,
  applicant_email  text not null,
  phone            text,
  linkedin_url     text,
  cover_letter     text,
  cv_path          text not null,
  cv_filename      text not null,
  status           text not null default 'pending'
                     check (status in ('pending', 'screening', 'screened', 'shortlisted', 'interview', 'offer', 'rejected', 'hired')),
  submitted_at     timestamptz not null default now()
);

-- ============================================================
-- AI SCREENINGS
-- ============================================================
create table public.ai_screenings (
  id              uuid primary key default uuid_generate_v4(),
  application_id  uuid not null unique references public.applications(id) on delete cascade,
  score           integer not null check (score >= 0 and score <= 100),
  summary         text not null,
  strengths       text[] not null default '{}',
  gaps            text[] not null default '{}',
  recommendation  text not null
                    check (recommendation in ('strong_yes', 'yes', 'maybe', 'no')),
  raw_response    text,
  screened_at     timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.ai_screenings enable row level security;

-- Profiles: users read own; admins read all
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "admins_read_all_profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id);

-- Jobs: public reads open jobs; admin full access; HM reads assigned
create policy "public_read_open_jobs" on public.jobs
  for select using (status = 'open');

create policy "admin_all_jobs" on public.jobs
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "hiring_manager_read_assigned_jobs" on public.jobs
  for select using (hiring_manager_id = auth.uid());

-- Applications: public insert; admin full; HM reads applications for their jobs
create policy "public_insert_applications" on public.applications
  for insert with check (true);

create policy "admin_all_applications" on public.applications
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "hiring_manager_read_applications" on public.applications
  for select using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.hiring_manager_id = auth.uid()
    )
  );

create policy "hiring_manager_update_applications" on public.applications
  for update using (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and j.hiring_manager_id = auth.uid()
    )
  );

-- AI screenings: admin + assigned HM read
create policy "admin_all_screenings" on public.ai_screenings
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "hiring_manager_read_screenings" on public.ai_screenings
  for select using (
    exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = application_id and j.hiring_manager_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Run in Supabase dashboard SQL editor or via CLI:
-- insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false);

-- Storage policies (run after creating bucket)
-- Allow anyone to upload CVs (public INSERT)
-- Allow authenticated service role to read CVs
