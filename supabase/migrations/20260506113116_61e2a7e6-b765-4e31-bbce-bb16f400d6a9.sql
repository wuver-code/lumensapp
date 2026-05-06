ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.contact_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_requests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;