REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.nodes FROM anon;
REVOKE ALL ON public.earnings_snapshots FROM anon;
REVOKE ALL ON public.payout_methods FROM anon;
REVOKE ALL ON public.payouts FROM anon;
REVOKE ALL ON public.leaderboard_entries FROM anon;

REVOKE ALL ON public.profiles FROM public;
REVOKE ALL ON public.nodes FROM public;
REVOKE ALL ON public.earnings_snapshots FROM public;
REVOKE ALL ON public.payout_methods FROM public;
REVOKE ALL ON public.payouts FROM public;
REVOKE ALL ON public.leaderboard_entries FROM public;

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

GRANT SELECT ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

GRANT SELECT ON public.network_config TO anon, authenticated;
GRANT ALL ON public.network_config TO service_role;