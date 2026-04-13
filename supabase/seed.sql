-- Run this in Supabase SQL editor to create your first admin user
-- After running the migration, create your admin via the Supabase Auth dashboard
-- or use the Admin API:
--
--   supabase auth admin create-user \
--     --email admin@yourcompany.com \
--     --password yourpassword \
--     --user-metadata '{"role":"admin","full_name":"Admin User"}'
--
-- Then verify the profile was created:
--   SELECT * FROM public.profiles;
--
-- To create the storage bucket (run in SQL editor):
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cvs',
  'cvs',
  false,
  8388608,  -- 8MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow uploads from anyone (candidates submitting CVs)
CREATE POLICY "allow_public_cv_uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cvs');

-- Storage policy: allow authenticated users to read CVs
CREATE POLICY "allow_authenticated_cv_reads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cvs' AND auth.role() = 'authenticated'
  );
