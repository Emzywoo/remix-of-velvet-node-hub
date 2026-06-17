import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardData, requestPayout } from "@/lib/miner.functions";
import { AppShell } from "@/components/AppShell";
import { NodeCard } from "@/components/NodeCard";
import { CountUp } from "@/components/CountUp";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Flame, Crown, Trophy, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NODERIFT" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchData = useServerFn(getDashboardData);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchData(),
    refetchInterval: 30_000,
  });
  const anyActive = data?.nodes.some(n => n.status === "ACTIVE") ?? false;

  return (
    <AppShell anyNodeActive={anyActive}>
      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent data={data} />
      )}
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-44 rounded-2xl bg-surface animate-pulse" />
      <div className="h-40 rounded-2xl bg-surface animate-pulse" />
      <div className="h-72 rounded-2xl bg-surface animate-pulse" />
    </div>
  );
}

function DashboardContent({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const queryClient = useQueryClient();
  const [showWithdraw, setShowWithdraw] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const weekStart = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }, []);
  const today = data.history.find(h => h.date === todayISO)?.usd ?? 0;
  const week = data.history.filter(h => h.date >= weekStart).reduce((s, h) => s + h.usd, 0);

  // Streak: consecutive days with snapshots
  const streak = computeStreak(data.history);

  const nextPayout = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const canWithdraw = data.totals.pending_payout_usd >= Number(data.config.minimum_payout_usd);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 md:p-8">
        <div className="absolute inset-0 opacity-[0.15] bg-earn-gradient" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Earned this month</div>
            <div className="font-mono text-5xl md:text-7xl font-bold leading-none text-earn-gradient">
              $<CountUp value={data.totals.total_earned_usd} decimals={4} duration={1200} />
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Next payout on <span className="text-foreground">{nextPayout}</span> · {data.totals.jobs_completed.toLocaleString()} jobs filtered
            </div>
            <button
              disabled={!canWithdraw}
              onClick={() => setShowWithdraw(true)}
              title={!canWithdraw ? `Minimum withdrawal is $${data.config.minimum_payout_usd}` : ""}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-rift px-5 py-3 font-semibold text-rift-foreground shadow-rift hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition">
              Withdraw Earnings
            </button>
          </div>
          <div className="flex md:flex-col gap-6 md:border-l md:border-border md:pl-6">
            <Mini label="Today" value={today} />
            <Mini label="This week" value={week} />
          </div>
        </div>
      </section>

      {/* NODES */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your Nodes</h2>
          <Link to="/setup" className="text-sm text-pulse hover:underline">+ Add node</Link>
        </div>
        {data.nodes.length === 0 ? (
          <EmptyNodes />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.nodes.map(n => <NodeCard key={n.id} node={n} />)}
          </div>
        )}
      </section>

      {/* CHART */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Earning history</h2>
          <div className="text-xs text-muted-foreground">
            Base rate: <span className="font-mono text-foreground">${Number(data.config.base_rate_per_gb).toFixed(3)}</span> / GB
          </div>
        </div>
        {data.history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Your earning history will appear here once your node processes its first job. Keep it running. You are almost there.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={data.history}>
                <CartesianGrid stroke="#1A2035" vertical={false} />
                <XAxis dataKey="date" stroke="#4A5568" fontSize={11} tickFormatter={d => d.slice(5)} />
                <YAxis stroke="#4A5568" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#0E1320", border: "1px solid #1A2035", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, key: any) => key === "usd" ? [`$${Number(v).toFixed(4)}`, "Earned"] : v}
                />
                <Bar dataKey="usd" fill="#00FF87" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">GB processed (month)</div>
            <div className="font-mono text-xl"><CountUp value={data.totals.gb_processed} decimals={3} /></div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Total coins</div>
            <div className="font-mono text-xl text-rift"><CountUp value={data.totals.total_coins} decimals={4} /></div>
          </div>
        </div>
      </section>

      {/* GAMIFICATION */}
      <section className="grid gap-3 md:grid-cols-3">
        <AchievementCard
          icon={<Flame className={streak >= 7 ? "text-amber" : "text-muted-foreground"} />}
          glow={streak >= 30 ? "elite" : streak >= 7 ? "amber" : null}
          title={`${streak} day streak`}
          subtitle="Keep your node online to protect your streak."
        />
        <TierProgressCard tier={data.nodes[0]?.tier ?? 3} />
        <AchievementCard
          icon={<Trophy className="text-pulse" />}
          title="Leaderboard"
          subtitle="See where you rank globally and in your country."
        />

      </section>

      {showWithdraw && (
        <WithdrawModal
          available={data.totals.pending_payout_usd}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => { setShowWithdraw(false); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); }}
        />
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-xl font-bold text-rift">$<CountUp value={value} decimals={4} /></div>
    </div>
  );
}

function EmptyNodes() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-sm text-muted-foreground">No nodes yet. Add your first node to start earning.</p>
      <Link to="/setup" className="mt-4 inline-flex rounded-lg bg-rift px-4 py-2 text-sm font-semibold text-rift-foreground">
        Get Your Node Running
      </Link>
    </div>
  );
}

function AchievementCard({ icon, title, subtitle, glow, rank }: { icon: React.ReactNode; title: string; subtitle: string; glow?: "elite" | "amber" | null; rank?: number }) {
  const cls = glow === "elite" ? "shadow-elite border-amber/40" : glow === "amber" ? "border-amber/30" : "border-border";
  return (
    <div className={`rounded-xl border bg-surface p-4 ${cls}`}>
      <div className="flex items-center gap-2 text-sm">{icon}<span className="font-semibold">{title}</span></div>
      {rank !== undefined && <div className="mt-2 font-mono text-3xl text-rift">#{rank}</div>}
      <div className="mt-2 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function TierProgressCard({ tier }: { tier: number }) {
  const target = tier === 3 ? "CORE NODE" : tier === 2 ? "RIFT ELITE" : "RIFT ELITE";
  const progress = tier === 1 ? 100 : tier === 2 ? 72 : 38;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-sm"><Crown className="text-amber" size={16} /><span className="font-semibold">Tier progress</span></div>
      <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-earn-gradient transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{progress}% to <span className="text-foreground font-semibold">{target}</span></div>
    </div>
  );
}

function WithdrawModal({ available, onClose, onSuccess }: { available: number; onClose: () => void; onSuccess: () => void }) {
  const reqPayout = useServerFn(requestPayout);
  const [method, setMethod] = useState<"crypto" | "stripe" | "bank">("crypto");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState(available);

  const mutation = useMutation({
    mutationFn: () => reqPayout({ data: { amount_usd: amount, method, destination } }),
    onSuccess: (p: any) => { toast.success(`Payout #${p.id.slice(0,8)} requested`); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold">Withdraw Earnings</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="text-xs text-muted-foreground">Available</div>
        <div className="font-mono text-4xl font-bold text-rift">${available.toFixed(4)}</div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Method</div>
          <div className="grid grid-cols-3 gap-2">
            {(["crypto", "stripe", "bank"] as const).map(m => (
              <button key={m} onClick={() => setMethod(m)}
                className={`rounded-lg border px-3 py-3 text-sm capitalize ${method === m ? "border-rift bg-rift/10 text-rift" : "border-border"}`}>
                {m === "stripe" ? "Stripe" : m === "bank" ? "Bank" : "Crypto"}
              </button>
            ))}
          </div>
        </div>

        <label className="block mt-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {method === "crypto" ? "Wallet address" : method === "bank" ? "IBAN / Account #" : "Stripe email"}
          </span>
          <input value={destination} onChange={e => setDestination(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift font-mono text-sm" />
        </label>
        <label className="block mt-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Amount (USD)</span>
          <input type="number" min={5} step={0.01} max={available} value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift font-mono" />
        </label>

        <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
          className="mt-5 w-full rounded-lg bg-rift py-3 font-semibold text-rift-foreground shadow-rift hover:opacity-90 disabled:opacity-50">
          {mutation.isPending ? "Processing…" : "Withdraw"}
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          Minimum $5.00. Payouts processed within 48 hours. MFA verification required.
        </p>
      </div>
    </div>
  );
}

function computeStreak(history: { date: string; usd: number }[]): number {
  if (history.length === 0) return 0;
  const dates = new Set(history.filter(h => h.usd > 0).map(h => h.date));
  let streak = 0;
  let d = new Date();
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
