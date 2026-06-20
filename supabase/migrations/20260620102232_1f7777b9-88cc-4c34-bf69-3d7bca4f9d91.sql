DROP FUNCTION IF EXISTS public.get_network_stats_public();
DROP FUNCTION IF EXISTS public.get_leaderboard_public(uuid, text);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

CREATE OR REPLACE VIEW public.leaderboard_public AS
WITH cfg AS (
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
)
SELECT
  user_totals.user_id,
  CASE
    WHEN length(COALESCE(user_totals.token, '')) > 8 THEN left(user_totals.token, 4) || '…' || right(user_totals.token, 4)
    ELSE COALESCE(user_totals.token, '')
  END AS masked_id,
  COALESCE(profiles.country, '—') AS country,
  COALESCE(user_totals.tier, 3) AS tier,
  (user_totals.coins * COALESCE((SELECT rate FROM cfg), 0.05))::numeric AS usd
FROM user_totals
LEFT JOIN public.profiles ON profiles.user_id = user_totals.user_id
WHERE user_totals.coins > 0 OR (SELECT COUNT(*) FROM user_totals) <= 50
ORDER BY (user_totals.coins * COALESCE((SELECT rate FROM cfg), 0.05)) DESC
LIMIT 50;

GRANT SELECT ON public.leaderboard_public TO authenticated;
GRANT ALL ON public.leaderboard_public TO service_role;