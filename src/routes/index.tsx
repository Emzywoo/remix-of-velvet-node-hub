import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getNetworkStats } from "@/lib/miner.functions";
import { Logo } from "@/components/Logo";
import { CountUp } from "@/components/CountUp";
import { ArrowRight, Cpu, DollarSign, Globe } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NODERIFT — Your machine works. You earn." },
      { name: "description", content: "Join thousands of node operators earning passive income by powering the world's telemetry infrastructure." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { data } = useQuery({
    queryKey: ["network-stats"],
    queryFn: () => getNetworkStats(),
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-rift animate-soft-pulse" />
          Live network — active right now
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Your machine works.<br />
          <span className="text-earn-gradient">You earn.</span>
        </h1>
        <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
          Join thousands of node operators earning passive income by powering the world's telemetry infrastructure. Install in 10 minutes. Earn while you sleep.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          <StatCard icon={<Cpu className="text-rift" size={18} />} label="Active Nodes Worldwide" value={data?.active_miners ?? 0} decimals={0} />
          <StatCard icon={<DollarSign className="text-rift" size={18} />} label="Earned This Month" value={data?.monthly_pool_usd ?? 0} prefix="$" decimals={0} />
          <StatCard icon={<Globe className="text-rift" size={18} />} label="Avg Monthly Earnings" value={data?.avg_monthly_usd ?? 0} prefix="$" decimals={2} />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth" search={{ mode: "register" } as any}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-rift px-6 py-3 text-base font-semibold text-rift-foreground shadow-rift hover:opacity-90 transition">
            Start Earning <ArrowRight size={18} className="group-hover:translate-x-0.5 transition" />
          </Link>
          <Link to="/auth" className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-semibold hover:bg-surface transition">
            Sign In
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">No credit card. No technical skill. Just download and run.</p>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 border-t border-border text-center text-xs text-muted-foreground">
        Every packet filtered is a penny earned. © NODERIFT
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value, prefix, decimals = 0 }: { icon: React.ReactNode; label: string; value: number; prefix?: string; decimals?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-left">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-2 font-mono text-2xl font-bold">
        <CountUp value={value} decimals={decimals} prefix={prefix} />
      </div>
    </div>
  );
}
