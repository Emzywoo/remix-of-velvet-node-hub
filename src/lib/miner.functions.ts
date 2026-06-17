// Aggregated miner data + payouts. Combines local DB with live TRIMLT summary.
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

    // Refresh live status from TRIMLT for each node and persist
    let totalCoins = 0;
    let totalJobs = 0;
    const nowIso = new Date().toISOString();

    // Online detection: TRIMLT miner-summary returns data whenever a token exists,
    // so we cannot use its mere presence as liveness. We treat the node as ACTIVE if
    // jobs_completed increased since the last poll (real work landed) OR last_seen is
    // within the freshness window. Otherwise OFFLINE (or WAITLISTED if never seen).
    const FRESH_MS = 3 * 60 * 1000;
    const liveNodes = await Promise.all(nodes.map(async (n) => {
      const live = await trimltGet(`/api/v1/external/miner-summary?token=${encodeURIComponent(n.miner_token)}`);
      const coins = Number(live?.total_coins ?? 0);
      const jobs = Number(live?.jobs_completed ?? 0);
      totalCoins += coins;
      totalJobs += jobs;

      const prevJobs = Number(n.active_jobs ?? 0);
      const jobsAdvanced = live !== null && jobs > prevJobs;
      const lastSeenMs = n.last_seen ? new Date(n.last_seen).getTime() : 0;
      const fresh = lastSeenMs > 0 && Date.now() - lastSeenMs < FRESH_MS;

      let status: string;
      let lastSeen = n.last_seen;
      if (jobsAdvanced) { status = "ACTIVE"; lastSeen = nowIso; }
      else if (fresh && n.status === "ACTIVE") { status = "ACTIVE"; }
      else if (n.status === "WAITLISTED" && jobs === 0 && lastSeenMs === 0) { status = "WAITLISTED"; }
      else { status = "OFFLINE"; }

      await supabase.from("nodes").update({
        status,
        active_jobs: jobs, // store cumulative jobs as the comparison baseline
        latency_ms: 0,
        last_seen: lastSeen,
      }).eq("id", n.id);
      return { ...n, status, active_jobs: jobs, latency_ms: 0, last_seen: lastSeen, live_coins: coins, live_jobs: jobs };
    }));

    // Upsert today's snapshot (aggregate across nodes)
    const today = new Date().toISOString().slice(0, 10);
    const gbToday = totalJobs * 0.05; // approx
    await supabase.from("earnings_snapshots").upsert({
      user_id: userId,
      snapshot_date: today,
      total_coins: totalCoins,
      jobs_completed: totalJobs,
      gb_processed: gbToday,
    }, { onConflict: "user_id,snapshot_date" });

    const totalEarnedUsd = totalCoins * Number(config.coin_to_usd_rate);

    // Build daily history (use snapshot diffs; snapshots store cumulative, derive per-day)
    const snaps = [...(snapsRes.data ?? [])];
    // ensure today is included
    if (!snaps.find(s => s.snapshot_date === today)) {
      snaps.push({ user_id: userId, snapshot_date: today, total_coins: totalCoins, jobs_completed: totalJobs, gb_processed: gbToday, id: "today", created_at: nowIso } as any);
    }
    snaps.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    const history = snaps.map((s, i) => {
      const prev = i === 0 ? { total_coins: 0, gb_processed: 0 } : snaps[i - 1];
      const coins = Math.max(0, Number(s.total_coins) - Number(prev.total_coins));
      const gb = Math.max(0, Number(s.gb_processed) - Number(prev.gb_processed));
      return {
        date: s.snapshot_date,
        coins,
        gb,
        usd: coins * Number(config.coin_to_usd_rate),
      };
    });

    // Pending payout = total earned - sum of completed+pending payouts
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

/** Leaderboard: top earners (anonymized). */
export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: "global" | "country" }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // pull current user's country
    const { data: me } = await context.supabase.from("profiles").select("country").eq("user_id", context.userId).maybeSingle();
    const userCountry = me?.country || "";
    // get this-month snapshots and profiles
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const { data: snaps } = await supabaseAdmin
      .from("earnings_snapshots")
      .select("user_id,total_coins,snapshot_date")
      .gte("snapshot_date", monthStart);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id,country");
    const { data: nodes } = await supabaseAdmin.from("nodes").select("user_id,miner_token,tier");
    const { data: config } = await supabaseAdmin.from("network_config").select("coin_to_usd_rate").eq("id",1).maybeSingle();
    const rate = Number(config?.coin_to_usd_rate ?? 0.05);

    const byUser = new Map<string, number>();
    for (const s of snaps ?? []) {
      const prev = byUser.get(s.user_id) ?? 0;
      // take MAX cumulative for the month
      byUser.set(s.user_id, Math.max(prev, Number(s.total_coins)));
    }
    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
    const nodeMap = new Map<string, { token: string; tier: number }>();
    for (const n of nodes ?? []) nodeMap.set(n.user_id, { token: n.miner_token, tier: n.tier });

    let rows = Array.from(byUser.entries()).map(([user_id, coins]) => {
      const prof = profileMap.get(user_id);
      const node = nodeMap.get(user_id);
      const token = node?.token ?? user_id;
      return {
        user_id,
        masked_id: token.length > 8 ? `${token.slice(0,4)}…${token.slice(-4)}` : token,
        country: prof?.country || "—",
        tier: node?.tier ?? 3,
        usd: coins * rate,
        is_me: user_id === context.userId,
      };
    });
    if (data.scope === "country" && userCountry) rows = rows.filter(r => r.country === userCountry);
    rows.sort((a, b) => b.usd - a.usd);
    return { rows: rows.slice(0, 50), userCountry };
  });
