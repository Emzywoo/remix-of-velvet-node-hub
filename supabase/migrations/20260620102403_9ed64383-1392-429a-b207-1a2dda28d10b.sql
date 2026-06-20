REVOKE EXECUTE ON FUNCTION public.refresh_leaderboard_entry_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_leaderboard_entry_for_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_refresh_leaderboard_entry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_refresh_leaderboard_entry() FROM authenticated;