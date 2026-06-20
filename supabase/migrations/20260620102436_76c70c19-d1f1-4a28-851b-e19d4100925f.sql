REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.nodes FROM PUBLIC;
REVOKE ALL ON public.earnings_snapshots FROM PUBLIC;
REVOKE ALL ON public.payouts FROM PUBLIC;
REVOKE ALL ON public.network_config FROM PUBLIC;
REVOKE ALL ON public.leaderboard_entries FROM PUBLIC;

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

GRANT SELECT ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;