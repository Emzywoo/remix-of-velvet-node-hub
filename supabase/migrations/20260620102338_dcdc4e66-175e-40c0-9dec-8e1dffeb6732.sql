DROP POLICY IF EXISTS "Users can create their own leaderboard entry" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Users can update their own leaderboard entry" ON public.leaderboard_entries;
DROP POLICY IF EXISTS "Users can delete their own leaderboard entry" ON public.leaderboard_entries;

REVOKE INSERT, UPDATE, DELETE ON public.leaderboard_entries FROM authenticated;
GRANT SELECT ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_entry_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE EXECUTE ON FUNCTION public.refresh_leaderboard_entry_for_user(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.tg_refresh_leaderboard_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_leaderboard_entry_for_user(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_refresh_leaderboard_entry() FROM PUBLIC;

DROP TRIGGER IF EXISTS refresh_leaderboard_after_nodes_change ON public.nodes;
CREATE TRIGGER refresh_leaderboard_after_nodes_change
AFTER INSERT OR UPDATE OR DELETE ON public.nodes
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_leaderboard_entry();

DROP TRIGGER IF EXISTS refresh_leaderboard_after_profile_change ON public.profiles;
CREATE TRIGGER refresh_leaderboard_after_profile_change
AFTER UPDATE OF country ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_leaderboard_entry();

SELECT public.refresh_leaderboard_entry_for_user(user_id)
FROM (SELECT DISTINCT user_id FROM public.nodes) existing_users;