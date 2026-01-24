-- Create table if not exists (idempotent fresh start)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT UNIQUE,
  contract_number TEXT,
  project_name TEXT,
  constructor_name TEXT,
  project_address TEXT,
  date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if not exist (for safety if partial)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'user_id') THEN
    ALTER TABLE public.jobs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'job_id') THEN
    ALTER TABLE public.jobs ADD COLUMN job_id TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'contract_number') THEN
    ALTER TABLE public.jobs ADD COLUMN contract_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'project_name') THEN
    ALTER TABLE public.jobs ADD COLUMN project_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'constructor_name') THEN
    ALTER TABLE public.jobs ADD COLUMN constructor_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'project_address') THEN
    ALTER TABLE public.jobs ADD COLUMN project_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'date') THEN
    ALTER TABLE public.jobs ADD COLUMN date TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'status') THEN
    ALTER TABLE public.jobs ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'created_at') THEN
    ALTER TABLE public.jobs ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'updated_at') THEN
    ALTER TABLE public.jobs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Make user_id NOT NULL if added nullable (safe)
ALTER TABLE public.jobs ALTER COLUMN user_id SET NOT NULL;

-- Enable RLS if not already
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "User insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "User read own jobs" ON public.jobs;
DROP POLICY IF EXISTS "User update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "User delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admin full access" ON public.jobs;

-- Create fresh policies
CREATE POLICY "User insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "User read own jobs" ON public.jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "User delete own jobs" ON public.jobs FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin full access" ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);