
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  country TEXT DEFAULT '',
  sound_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_offline BOOLEAN NOT NULL DEFAULT true,
  notify_tier BOOLEAN NOT NULL DEFAULT true,
  notify_payout BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Nodes (one user can have several)
CREATE TABLE public.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'My Node',
  miner_token TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Global',
  tier INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'WAITLISTED',
  active_jobs INT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  waitlist_position INT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nodes" ON public.nodes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX nodes_user_idx ON public.nodes(user_id);

-- Payout methods
CREATE TABLE public.payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  destination TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_methods TO authenticated;
GRANT ALL ON public.payout_methods TO service_role;
ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payout methods" ON public.payout_methods FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Payouts
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd NUMERIC(12,4) NOT NULL,
  method TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payouts" ON public.payouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Earnings snapshots (daily per user, aggregated across nodes)
CREATE TABLE public.earnings_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_coins NUMERIC(20,6) NOT NULL DEFAULT 0,
  jobs_completed INT NOT NULL DEFAULT 0,
  gb_processed NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.earnings_snapshots TO authenticated;
GRANT ALL ON public.earnings_snapshots TO service_role;
ALTER TABLE public.earnings_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snapshots" ON public.earnings_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Network config (single row, public read)
CREATE TABLE public.network_config (
  id INT PRIMARY KEY DEFAULT 1,
  coin_to_usd_rate NUMERIC(10,6) NOT NULL DEFAULT 0.05,
  base_rate_per_gb NUMERIC(10,6) NOT NULL DEFAULT 0.012,
  minimum_payout_usd NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  monthly_pool_usd NUMERIC(14,2) NOT NULL DEFAULT 184523.00,
  active_miners INT NOT NULL DEFAULT 4287,
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT ON public.network_config TO authenticated, anon;
GRANT ALL ON public.network_config TO service_role;
ALTER TABLE public.network_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read config" ON public.network_config FOR SELECT TO authenticated, anon USING (true);
INSERT INTO public.network_config (id) VALUES (1);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE TRIGGER nodes_updated_at BEFORE UPDATE ON public.nodes FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'country', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
