GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;
GRANT ALL ON public.nodes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.earnings_snapshots TO authenticated;
GRANT ALL ON public.earnings_snapshots TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

GRANT SELECT ON public.network_config TO anon;
GRANT SELECT ON public.network_config TO authenticated;
GRANT ALL ON public.network_config TO service_role;

CREATE OR REPLACE FUNCTION public.get_network_stats_public()
RETURNS TABLE (
  active_miners integer,
  monthly_pool_usd numeric,
  avg_monthly_usd numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cfg AS (
    SELECT
      COALESCE(active_miners, 4287) AS configured_miners,
      COALESCE(monthly_pool_usd, 184523) AS pool_usd
    FROM public.network_config
    WHERE id = 1
  ), counts AS (
    SELECT COUNT(*)::integer AS node_count
    FROM public.nodes
  )
  SELECT
    GREATEST(COALESCE(cfg.configured_miners, 4287), COALESCE(counts.node_count, 0))::integer AS active_miners,
    COALESCE(cfg.pool_usd, 184523)::numeric AS monthly_pool_usd,
    (COALESCE(cfg.pool_usd, 184523)::numeric / GREATEST(GREATEST(COALESCE(cfg.configured_miners, 4287), COALESCE(counts.node_count, 0)), 1))::numeric AS avg_monthly_usd
  FROM cfg
  CROSS JOIN counts
  UNION ALL
  SELECT 4287, 184523, (184523::numeric / 4287::numeric)
  WHERE NOT EXISTS (SELECT 1 FROM cfg);
$$;

GRANT EXECUTE ON FUNCTION public.get_network_stats_public() TO anon;
GRANT EXECUTE ON FUNCTION public.get_network_stats_public() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_network_stats_public() TO service_role;

CREATE OR REPLACE FUNCTION public.get_leaderboard_public(_viewer_id uuid, _scope text DEFAULT 'global')
RETURNS TABLE (
  user_id uuid,
  masked_id text,
  country text,
  tier integer,
  usd numeric,
  is_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewer AS (
    SELECT COALESCE(country, '') AS country
    FROM public.profiles
    WHERE profiles.user_id = _viewer_id
  ), cfg AS (
    SELECT COALESCE(coin_to_usd_rate, 0.05) AS rate
    FROM public.network_config
    WHERE id = 1
  ), user_totals AS (
    SELECT
      nodes.user_id,
      SUM(COALESCE(nodes.cumulative_coins, 0)) AS coins,
      (ARRAY_AGG(nodes.miner_token ORDER BY nodes.created_at))[1] AS token,
      (ARRAY_AGG(nodes.tier ORDER BY nodes.created_at))[1] AS tier
    FROM public.nodes
    GROUP BY nodes.user_id
  ), ranked AS (
    SELECT
      user_totals.user_id,
      CASE
        WHEN length(COALESCE(user_totals.token, '')) > 8 THEN left(user_totals.token, 4) || '…' || right(user_totals.token, 4)
        ELSE COALESCE(user_totals.token, '')
      END AS masked_id,
      COALESCE(profiles.country, '—') AS country,
      COALESCE(user_totals.tier, 3) AS tier,
      (user_totals.coins * COALESCE((SELECT rate FROM cfg), 0.05))::numeric AS usd,
      (user_totals.user_id = _viewer_id) AS is_me,
      COALESCE((SELECT country FROM viewer), '') AS viewer_country
    FROM user_totals
    LEFT JOIN public.profiles ON profiles.user_id = user_totals.user_id
    WHERE user_totals.coins > 0 OR (SELECT COUNT(*) FROM user_totals) <= 50
  )
  SELECT ranked.user_id, ranked.masked_id, ranked.country, ranked.tier, ranked.usd, ranked.is_me
  FROM ranked
  WHERE _scope <> 'country' OR ranked.viewer_country = '' OR ranked.country = ranked.viewer_country
  ORDER BY ranked.usd DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_public(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_public(uuid, text) TO service_role;