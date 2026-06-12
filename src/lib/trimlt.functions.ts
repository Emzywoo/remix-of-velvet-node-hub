// TRIMLT Core Server proxy — keeps the admin secret server-side only.
// Public miner-facing endpoint: https://api.vlonode.xyz
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIMLT_BASE = "https://api.vlonode.xyz";

async function trimltFetch(path: string, init: RequestInit = {}) {
  const key = process.env.TRIMLT_WEB_KEY;
  if (!key) throw new Error("TRIMLT_WEB_KEY not configured");
  const res = await fetch(`${TRIMLT_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-TRIMLT-WEB-KEY": key,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "object" && body?.error ? body.error : `TRIMLT ${res.status}`;
    throw new Error(`${msg} (${path})`);
  }
  return body;
}

/** Register a new node with the core engine. Returns miner_token. */
export const syncMinerWithCore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string; label?: string; region?: string }) => input)
  .handler(async ({ data, context }) => {
    let token = "";
    try {
      const resp = await trimltFetch("/api/v1/external/sync-miner", {
        method: "POST",
        body: JSON.stringify({ username: data.username }),
      });
      token = resp?.miner_token || resp?.token || "";
    } catch (e) {
      // If TRIMLT is unreachable, still create a placeholder so the user can proceed.
      // The CLI verify step will fail until the token is real; surface a warning.
      console.warn("TRIMLT sync-miner failed, using local placeholder:", e);
    }
    if (!token) token = `local-${crypto.randomUUID()}`;

    const { data: node, error } = await context.supabase
      .from("nodes")
      .insert({
        user_id: context.userId,
        miner_token: token,
        label: data.label || "My Node",
        region: data.region || "Global",
        status: "WAITLISTED",
        waitlist_position: Math.floor(Math.random() * 500) + 50,
      })
      .select()
      .single();
    if (error) throw error;
    return node;
  });

/** Fetch live summary (coins + jobs) for one miner token from TRIMLT. */
export const fetchMinerSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    try {
      const resp = await trimltFetch(`/api/v1/external/miner-summary?token=${encodeURIComponent(data.token)}`, {
        method: "GET",
      });
      return {
        total_coins: Number(resp?.total_coins ?? 0),
        jobs_completed: Number(resp?.jobs_completed ?? 0),
        online: true,
      };
    } catch (e) {
      return { total_coins: 0, jobs_completed: 0, online: false, error: String(e) };
    }
  });
