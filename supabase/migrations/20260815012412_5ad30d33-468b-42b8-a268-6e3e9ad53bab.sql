-- Playlists: manual creation + sharing + offline flag
ALTER TABLE public.playlists
  ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN mood SET DEFAULT '',
  ALTER COLUMN prompt SET DEFAULT '';

ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS offline_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_url text;

CREATE UNIQUE INDEX IF NOT EXISTS playlists_share_token_idx ON public.playlists (share_token);

DROP POLICY IF EXISTS "Anyone can view shared playlists" ON public.playlists;
CREATE POLICY "Anyone can view shared playlists"
  ON public.playlists FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

GRANT SELECT ON public.playlists TO anon;

-- Profiles: instagram handle + premium flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text;

-- Game scores
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_title text NOT NULL DEFAULT '',
  track_artist text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_scores TO authenticated;
GRANT ALL ON public.game_scores TO service_role;

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own scores" ON public.game_scores;
CREATE POLICY "Users manage their own scores"
  ON public.game_scores FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);