DROP VIEW IF EXISTS public.leaderboard_public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  user_id uuid PRIMARY KEY,
  masked_id text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '—',
  tier integer NOT NULL DEFAULT 3,
  usd numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signed-in users can view leaderboard entries" ON public.leaderboard_entries;
CREATE POLICY "Signed-in users can view leaderboard entries"
ON public.leaderboard_entries
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create their own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can create their own leaderboard entry"
ON public.leaderboard_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can update their own leaderboard entry"
ON public.leaderboard_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can delete their own leaderboard entry"
ON public.leaderboard_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);