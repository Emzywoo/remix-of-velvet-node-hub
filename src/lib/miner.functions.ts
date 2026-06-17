// Aggregated miner data + payouts. Combines local DB (source of truth for
// cumulative totals) with live TRIMLT summary (source of truth for liveness).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIMLT_BASE = "https://api.vlonode.xyz";

async function trimltGet(path: string) {
  const key = process.env.TRIMLT_WEB_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${TRIMLT_BASE}${path}`, {
      headers: { "X-TRIMLT-WEB-KEY": key },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** One-shot dashboard fetch: profile, nodes (with live status), summary, config, history. */
export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, nodesRes, configRes, snapsRes, payoutsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("nodes").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("network_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("earnings_snapshots").select("*").eq("user_id", userId)
        .gte("snapshot_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10))
        .order("snapshot_date"),
      supabase.from("payouts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    const config = configRes.data ?? { coin_to_usd_rate: 0.05, base_rate_per_gb: 0.012, minimum_payout_usd: 5, monthly_pool_usd: 184523, active_miners: 4287 };
    const nodes = nodesRes.data ?? [];

    let totalCoins = 0;
    let totalJobs = 0;
    const nowIso = new Date().toISOString();
    const FRESH_MS = 3 * 60 * 1000; // node is "fresh" if seen in last 3min

    const liveNodes = await Promise.all(nodes.map(async (n: any) => {
      const live = await trimltGet(`/api/v1/external/miner-summary?token=${encodeURIComponent(n.miner_token)}`);

      // Stored high-water marks (never go backwards)
      const storedCoins = Number(n.cumulative_coins ?? 0);
      const storedJobs = Number(n.cumulative_jobs ?? 0);

      // Live values — only trust when API responded
      const liveCoins = live ? Number(live.total_coins ?? 0) : storedCoins;
      const liveJobs = live ? Number(live.jobs_completed ?? 0) : storedJobs;

      // Persisted cumulative = MAX(stored, live). Protects against API blips & resets.
      const cumCoins = Math.max(storedCoins, liveCoins);
      const cumJobs = Math.max(storedJobs, liveJobs);

      totalCoins += cumCoins;
      totalJobs += cumJobs;

      // Liveness: ACTIVE if jobs advanced this poll OR last_seen is fresh.
      const jobsAdvanced = live !== null && liveJobs > storedJobs;
      const lastSeenMs = n.last_seen ? new Date(n.last_seen).getTime() : 0;
      const fresh = lastSeenMs > 0 && Date.now() - lastSeenMs < FRESH_MS;

      let status: string;
      let lastSeen: string | null = n.last_seen;
      if (jobsAdvanced) { status = "ACTIVE"; lastSeen = nowIso; }
      else if (fresh && (n.status === "ACTIVE" || n.status === "WAITLISTED")) { status = n.status; }
      else if (n.status === "WAITLISTED" && cumJobs === 0 && !lastSeenMs) { status = "WAITLISTED"; }
      else { status = "OFFLINE"; }

      // Persist (never overwrite cumulative downward)
      const patch: any = {
        status,
        cumulative_coins: cumCoins,
        cumulative_jobs: cumJobs,
        active_jobs: cumJobs,
        last_seen: lastSeen,
      };
      await supabase.from("nodes").update(patch).eq("id", n.id);

      return { ...n, ...patch };
    }));

    // Upsert today's snapshot, never lowering values
    const today = new Date().toISOString().slice(0, 10);
    const todaySnap = (snapsRes.data ?? []).find(s => s.snapshot_date === today);
    const nextTodayCoins = Math.max(Number(todaySnap?.total_coins ?? 0), totalCoins);
    const nextTodayJobs = Math.max(Number(todaySnap?.jobs_completed ?? 0), totalJobs);
    await supabase.from("earnings_snapshots").upsert({
      user_id: userId,
      snapshot_date: today,
      total_coins: nextTodayCoins,
      jobs_completed: nextTodayJobs,
      gb_processed: Number(todaySnap?.gb_processed ?? 0),
    }, { onConflict: "user_id,snapshot_date" });

    const totalEarnedUsd = totalCoins * Number(config.coin_to_usd_rate);

    // Build daily history from snapshots (cumulative → per-day deltas)
    const snaps = [...(snapsRes.data ?? [])];
    const todayIdx = snaps.findIndex(s => s.snapshot_date === today);
    const todayRow = { user_id: userId, snapshot_date: today, total_coins: nextTodayCoins, jobs_completed: nextTodayJobs, gb_processed: Number(todaySnap?.gb_processed ?? 0), id: "today", created_at: nowIso } as any;
    if (todayIdx >= 0) snaps[todayIdx] = todayRow; else snaps.push(todayRow);
    snaps.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

    const history = snaps.map((s, i) => {
      const prev = i === 0 ? { total_coins: 0, gb_processed: 0 } : snaps[i - 1];
      const coins = Math.max(0, Number(s.total_coins) - Number(prev.total_coins));
      const gb = Math.max(0, Number(s.gb_processed) - Number(prev.gb_processed));
      return { date: s.snapshot_date, coins, gb, usd: coins * Number(config.coin_to_usd_rate) };
    });

    const payouts = payoutsRes.data ?? [];
    const paidOut = payouts.filter(p => p.status !== "failed").reduce((s, p) => s + Number(p.amount_usd), 0);
    const pendingPayoutUsd = Math.max(0, totalEarnedUsd - paidOut);

    return {
      profile: profileRes.data,
      nodes: liveNodes,
      config,
      totals: {
        total_coins: totalCoins,
        total_earned_usd: totalEarnedUsd,
        jobs_completed: totalJobs,
        gb_processed: history.reduce((s, h) => s + h.gb, 0),
        pending_payout_usd: pendingPayoutUsd,
      },
      history,
      payouts,
    };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { amount_usd: number; method: string; destination: string }) => input)
  .handler(async ({ data, context }) => {
    if (data.amount_usd < 5) throw new Error("Minimum withdrawal is $5.00");
    if (!data.destination?.trim()) throw new Error("Destination is required");
    const { data: payout, error } = await context.supabase.from("payouts").insert({
      user_id: context.userId,
      amount_usd: data.amount_usd,
      method: data.method,
      destination: data.destination,
      status: "pending",
    }).select().single();
    if (error) throw error;
    return payout;
  });

export const removeNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { node_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("nodes").delete().eq("id", data.node_id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<{ full_name: string; country: string; sound_enabled: boolean; notify_offline: boolean; notify_tier: boolean; notify_payout: boolean }>) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/** Public-ish stats for the landing page. No auth — uses admin client. */
export const getNetworkStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: config } = await supabaseAdmin.from("network_config").select("*").eq("id", 1).maybeSingle();
    const { count: minerCount } = await supabaseAdmin.from("nodes").select("*", { count: "exact", head: true });
    const cfg = config ?? { active_miners: 4287, monthly_pool_usd: 184523, base_rate_per_gb: 0.012 };
    const activeMiners = Math.max(Number(cfg.active_miners), minerCount ?? 0);
    return {
      active_miners: activeMiners,
      monthly_pool_usd: Number(cfg.monthly_pool_usd),
      avg_monthly_usd: Number(cfg.monthly_pool_usd) / Math.max(activeMiners, 1),
    };
  });

/** Leaderboard: top earners ranked by stored cumulative coins (the high-water mark). */
export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: "global" | "country" }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await context.supabase.from("profiles").select("country").eq("user_id", context.userId).maybeSingle();
    const userCountry = me?.country || "";

    const { data: nodes } = await supabaseAdmin.from("nodes").select("user_id,miner_token,tier,cumulative_coins");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id,country");
    const { data: config } = await supabaseAdmin.from("network_config").select("coin_to_usd_rate").eq("id",1).maybeSingle();
    const rate = Number(config?.coin_to_usd_rate ?? 0.05);

    const byUser = new Map<string, { coins: number; token: string; tier: number }>();
    for (const n of (nodes as any[]) ?? []) {
      const prev = byUser.get(n.user_id);
      const coins = (prev?.coins ?? 0) + Number(n.cumulative_coins ?? 0);
      byUser.set(n.user_id, { coins, token: prev?.token ?? n.miner_token, tier: prev?.tier ?? n.tier });
    }
    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

    let rows = Array.from(byUser.entries())
      .filter(([, v]) => v.coins > 0 || byUser.size <= 50) // include zero-coin nodes only if leaderboard is sparse
      .map(([user_id, v]) => {
        const prof = profileMap.get(user_id);
        return {
          user_id,
          masked_id: v.token.length > 8 ? `${v.token.slice(0,4)}…${v.token.slice(-4)}` : v.token,
          country: prof?.country || "—",
          tier: v.tier,
          usd: v.coins * rate,
          is_me: user_id === context.userId,
        };
      });
    if (data.scope === "country" && userCountry) rows = rows.filter(r => r.country === userCountry);
    rows.sort((a, b) => b.usd - a.usd);
    return { rows: rows.slice(0, 50), userCountry };
  });
