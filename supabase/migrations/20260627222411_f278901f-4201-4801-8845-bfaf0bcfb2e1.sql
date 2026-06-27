GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.earnings_snapshots TO authenticated;
GRANT ALL ON public.earnings_snapshots TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_methods TO authenticated;
GRANT ALL ON public.payout_methods TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

GRANT SELECT ON public.network_config TO anon, authenticated;
GRANT ALL ON public.network_config TO service_role;

GRANT SELECT ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_entry_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _coins numeric;
  _token text;
  _tier integer;
  _country text;
  _rate numeric;
BEGIN
  SELECT COALESCE(coin_to_usd_rate, 0.05)
  INTO _rate
  FROM public.network_config
  WHERE id = 1;

  _rate := COALESCE(_rate, 0.05);

  SELECT
    SUM(COALESCE(cumulative_coins, 0)),
    (ARRAY_AGG(miner_token ORDER BY created_at))[1],
    (ARRAY_AGG(tier ORDER BY created_at))[1]
  INTO _coins, _token, _tier
  FROM public.nodes
  WHERE user_id = _user_id
  GROUP BY user_id;

  IF _coins IS NULL THEN
    DELETE FROM public.leaderboard_entries WHERE user_id = _user_id;
    RETURN;
  END IF;

  SELECT COALESCE(country, '—')
  INTO _country
  FROM public.profiles
  WHERE user_id = _user_id;

  INSERT INTO public.leaderboard_entries (user_id, masked_id, country, tier, usd, updated_at)
  VALUES (
    _user_id,
    CASE
      WHEN length(COALESCE(_token, '')) > 8 THEN left(_token, 4) || '…' || right(_token, 4)
      ELSE COALESCE(_token, '')
    END,
    COALESCE(NULLIF(_country, ''), '—'),
    COALESCE(_tier, 3),
    COALESCE(_coins, 0) * _rate,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    masked_id = EXCLUDED.masked_id,
    country = EXCLUDED.country,
    tier = EXCLUDED.tier,
    usd = EXCLUDED.usd,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_refresh_leaderboard_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_leaderboard_entry_for_user(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_leaderboard_after_nodes_change ON public.nodes;
CREATE TRIGGER refresh_leaderboard_after_nodes_change
AFTER INSERT OR UPDATE OR DELETE ON public.nodes
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_leaderboard_entry();

INSERT INTO public.network_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (user_id, email, full_name, country)
SELECT u.id, COALESCE(u.email, ''), COALESCE(u.raw_user_meta_data->>'full_name', ''), COALESCE(u.raw_user_meta_data->>'country', '')
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

SELECT public.refresh_leaderboard_entry_for_user(user_id)
FROM public.nodes
GROUP BY user_id;