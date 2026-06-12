import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard, getDashboardData } from "@/lib/miner.functions";
import { AppShell } from "@/components/AppShell";
import { TierBadge } from "@/components/TierBadge";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — NODERIFT" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const [scope, setScope] = useState<"global" | "country">("global");
  const fetchLB = useServerFn(getLeaderboard);
  const fetchDash = useServerFn(getDashboardData);
  const { data } = useQuery({ queryKey: ["lb", scope], queryFn: () => fetchLB({ data: { scope } }) });
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const anyActive = dash?.nodes.some(n => n.status === "ACTIVE") ?? false;
  const top = data?.rows[0];

  return (
    <AppShell anyNodeActive={anyActive}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <div className="flex rounded-lg bg-surface p-1 border border-border text-sm">
            <button onClick={() => setScope("global")} className={`rounded-md px-3 py-1.5 ${scope === "global" ? "bg-surface-2 text-rift" : "text-muted-foreground"}`}>Global</button>
            <button onClick={() => setScope("country")} className={`rounded-md px-3 py-1.5 ${scope === "country" ? "bg-surface-2 text-rift" : "text-muted-foreground"}`}>My Country</button>
          </div>
        </header>

        {top && (
          <div className="rounded-2xl border border-rift/30 bg-surface p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-earn-gradient" />
            <div className="relative">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Top earner this month</div>
              <div className="font-mono text-5xl font-bold text-earn-gradient mt-2">${top.usd.toFixed(2)}</div>
              <div className="mt-2 text-sm text-muted-foreground">Your node is earning right now too. Climb the ranks.</div>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-background/50">
              <tr><th className="px-4 py-2 text-left">Rank</th><th className="px-4 py-2 text-left">Node</th><th className="px-4 py-2 text-left">Country</th><th className="px-4 py-2 text-left">Tier</th><th className="px-4 py-2 text-right">Earned</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.rows ?? []).map((r, i) => (
                <tr key={r.user_id} className={r.is_me ? "border-l-2 border-l-rift bg-rift/5" : ""}>
                  <td className="px-4 py-2 font-mono">#{i + 1}</td>
                  <td className="px-4 py-2 font-mono">{r.masked_id}{r.is_me && <span className="ml-2 text-rift text-xs">(you)</span>}</td>
                  <td className="px-4 py-2">{r.country}</td>
                  <td className="px-4 py-2"><TierBadge tier={r.tier} /></td>
                  <td className="px-4 py-2 text-right font-mono text-rift">${r.usd.toFixed(2)}</td>
                </tr>
              ))}
              {(!data || data.rows.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">The leaderboard fills up as the network grows. Be early.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
