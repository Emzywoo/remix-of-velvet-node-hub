import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardData } from "@/lib/miner.functions";
import { AppShell } from "@/components/AppShell";
import { DataLoadError } from "@/components/DataLoadError";
import { isAuthSessionError, useAuthErrorHandler } from "@/hooks/useAuthErrorHandler";

export const Route = createFileRoute("/_authenticated/earnings")({
  head: () => ({ meta: [{ title: "Earnings — NODERIFT" }] }),
  component: Earnings,
});

function Earnings() {
  const fetchData = useServerFn(getDashboardData);
  const { data, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchData(),
    retry: (failureCount, queryError) => !isAuthSessionError(queryError) && failureCount < 2,
  });
  useAuthErrorHandler(error);
  const anyActive = data?.nodes.some(n => n.status === "ACTIVE") ?? false;
  const rate = Number(data?.config.coin_to_usd_rate ?? 0.05);
  const tier = data?.nodes[0]?.tier ?? 3;
  const multiplier = tier === 1 ? 1.5 : tier === 2 ? 1.2 : 1;

  return (
    <AppShell anyNodeActive={anyActive}>
      <div className="space-y-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">Earnings & Payouts</h1>

        {error && !data && !isAuthSessionError(error) && <DataLoadError error={error} onRetry={() => refetch()} />}

        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold">History</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-background/50">
                <tr><th className="text-left px-5 py-2">Date</th><th className="text-right px-5 py-2">GB</th><th className="text-right px-5 py-2">Multiplier</th><th className="text-right px-5 py-2">Earned</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.history ?? []).slice().reverse().map(h => (
                  <tr key={h.date}>
                    <td className="px-5 py-2 font-mono">{h.date}</td>
                    <td className="px-5 py-2 text-right font-mono">{h.gb.toFixed(3)}</td>
                    <td className="px-5 py-2 text-right font-mono">×{multiplier}</td>
                    <td className="px-5 py-2 text-right font-mono text-rift">${(h.usd * multiplier).toFixed(4)}</td>
                  </tr>
                ))}
                {(!data || data.history.length === 0) && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No history yet. Start your node to see entries here.</td></tr>
                )}
              </tbody>
              {data && data.history.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-background/30">
                    <td className="px-5 py-3 font-semibold">Total</td><td /><td />
                    <td className="px-5 py-3 text-right font-mono font-bold text-rift">
                      ${data.history.reduce((s, h) => s + h.usd * multiplier, 0).toFixed(4)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-sm font-semibold">Payout history</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-background/50">
                <tr><th className="text-left px-5 py-2">Date</th><th className="text-right px-5 py-2">Amount</th><th className="text-left px-5 py-2">Method</th><th className="text-left px-5 py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.payouts ?? []).map(p => (
                  <tr key={p.id}>
                    <td className="px-5 py-2 font-mono">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-2 text-right font-mono">${Number(p.amount_usd).toFixed(2)}</td>
                    <td className="px-5 py-2 capitalize">{p.method}</td>
                    <td className={`px-5 py-2 capitalize ${p.status === "completed" ? "text-rift" : p.status === "failed" ? "text-danger" : "text-amber"}`}>{p.status}</td>
                  </tr>
                ))}
                {(!data || data.payouts.length === 0) && (
                  <tr><td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">No payouts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">Coin rate: ${rate.toFixed(4)} / coin · Tier {tier} multiplier ×{multiplier}</p>
      </div>
    </AppShell>
  );
}
