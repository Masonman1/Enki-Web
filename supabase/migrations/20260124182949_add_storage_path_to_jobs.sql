-- Add storage_path column if not exist (idempotent)
DO $$    
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'storage_path') THEN
    ALTER TABLE public.jobs ADD COLUMN storage_path TEXT;  -- e.g., 'jobs/7229-013/user_a288c013-35e9-4d16-8313-31804fae9b9b/'
  END IF;
END     $$;

-- Optional: Backfill for existing rows (e.g., generate path from job_id and user_id)
UPDATE public.jobs 
SET storage_path = CONCAT('jobs/', job_id, '/user_', user_id, '/')
WHERE storage_path IS NULL;