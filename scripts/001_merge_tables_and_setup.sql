-- ============================================================
-- Migration: Merge profiles into users, add password_reset_requests,
-- add must_change_password column, update trigger + is_admin function
-- ============================================================

-- 1. Add must_change_password column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- 2. Copy any profiles data that doesn't exist in users
INSERT INTO public.users (id, full_name, email, phone, role, unit_number, status, avatar_url, created_at, updated_at)
SELECT p.id, p.full_name, p.email, p.phone, p.role, p.unit_number, p.status, p.avatar_url, p.created_at, p.updated_at
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- 3. Drop all FK constraints that reference profiles
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_assigned_to_fkey;
ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_raised_by_fkey;
ALTER TABLE public.management_committee DROP CONSTRAINT IF EXISTS management_committee_user_id_fkey;
ALTER TABLE public.visitors DROP CONSTRAINT IF EXISTS visitors_registered_by_fkey;
ALTER TABLE public.visitors DROP CONSTRAINT IF EXISTS visitors_approved_by_fkey;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.voting DROP CONSTRAINT IF EXISTS voting_created_by_fkey;

-- 4. Re-create FK constraints pointing to users instead of profiles
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.complaints ADD CONSTRAINT complaints_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.complaints ADD CONSTRAINT complaints_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.management_committee ADD CONSTRAINT management_committee_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.visitors ADD CONSTRAINT visitors_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.visitors ADD CONSTRAINT visitors_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.votes ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.voting ADD CONSTRAINT voting_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Drop old RLS policies on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

-- 6. Drop the profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 7. Update RLS policies on users table
-- Drop existing basic policies
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Create comprehensive policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view users"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can insert users"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update any user"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('app_admin', 'management')
    )
  );

CREATE POLICY "Admin can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('app_admin', 'management')
    )
  );

-- 8. Update is_admin() function to reference users table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()
    AND role IN ('app_admin', 'management')
  );
END;
$$;

-- 9. Update handle_new_user trigger to insert into users (not profiles) with role='resident'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, phone, role, status, must_change_password, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'phone', ''),
    'resident',
    'active',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 10. Create password_reset_requests table
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reset requests"
  ON public.password_reset_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all reset requests"
  ON public.password_reset_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('app_admin', 'management')
    )
  );

CREATE POLICY "Authenticated users can insert reset requests"
  ON public.password_reset_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update reset requests"
  ON public.password_reset_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('app_admin', 'management')
    )
  );
