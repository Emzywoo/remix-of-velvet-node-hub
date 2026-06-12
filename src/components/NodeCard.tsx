import { TierBadge } from "./TierBadge";
import { Info } from "lucide-react";

interface NodeData {
  id: string;
  miner_token: string;
  region: string;
  tier: number;
  status: string;
  active_jobs: number;
  latency_ms: number;
  waitlist_position?: number | null;
}

export function NodeCard({ node }: { node: NodeData }) {
  const isActive = node.status === "ACTIVE";
  const isWaitlist = node.status === "WAITLISTED";
  const load = Math.min(node.active_jobs / 12, 1);
  const loadColor = load < 0.7 ? "bg-rift" : load < 1 ? "bg-amber" : "bg-danger";
  const dotColor = isActive ? "bg-rift" : isWaitlist ? "bg-amber" : "bg-danger";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-4">
      {isWaitlist && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-amber/15 px-2 py-1 text-[11px] text-amber">
          <Info size={11} />
          Position #{node.waitlist_position ?? "—"}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-sm text-muted-foreground truncate">{node.miner_token.slice(0, 12)}…</div>
          <div className="mt-1 text-xs text-muted-foreground">{node.region}</div>
        </div>
        <div className="flex items-center justify-center">
          <span className={`relative inline-flex h-4 w-4 rounded-full ${dotColor}`}>
            {isActive && <span className="absolute inset-0 rounded-full animate-node-pulse" />}
          </span>
        </div>
        <div className="text-right text-xs space-y-1">
          <div><span className="font-mono text-foreground">{node.active_jobs}</span> <span className="text-muted-foreground">jobs</span></div>
          <div><span className="font-mono text-foreground">{node.latency_ms}</span><span className="text-muted-foreground">ms</span></div>
          <TierBadge tier={node.tier} />
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${loadColor} transition-all`} style={{ width: `${load * 100}%` }} />
      </div>
      {isWaitlist && (
        <div className="mt-3 rounded-md bg-amber/10 px-3 py-2 text-xs text-amber/90">
          The network is at capacity. Your node will be activated automatically. Keep 95%+ uptime to move up the waitlist.
        </div>
      )}
    </div>
  );
}
