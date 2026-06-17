import { TierBadge } from "./TierBadge";
import { Info } from "lucide-react";

interface NodeData {
  id: string;
  miner_token: string;
  region: string;
  tier: number;
  status: string;
  active_jobs: number; // cumulative jobs filtered (from TRIMLT)
  last_seen?: string | null;
  waitlist_position?: number | null;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NodeCard({ node }: { node: NodeData }) {
  const isActive = node.status === "ACTIVE";
  const isWaitlist = node.status === "WAITLISTED";
  const dotColor = isActive ? "bg-rift" : isWaitlist ? "bg-amber" : "bg-danger";
  const statusLabel = isActive ? "Active" : isWaitlist ? "Waitlisted" : "Offline";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`}>
              {isActive && <span className={`absolute inset-0 rounded-full ${dotColor} animate-node-pulse opacity-60`} />}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{statusLabel}</span>
          </div>
          <div className="mt-2 font-mono text-sm text-foreground truncate">{node.miner_token.slice(0, 8)}…{node.miner_token.slice(-4)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{node.region} · last seen {timeAgo(node.last_seen)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl text-rift">{node.active_jobs.toLocaleString()}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">jobs filtered</div>
          <div className="mt-2"><TierBadge tier={node.tier} /></div>
        </div>
      </div>
      {isWaitlist && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber/10 px-3 py-2 text-xs text-amber/90">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>Network is at capacity. Your node activates automatically once a slot frees up. Keep it running.</span>
        </div>
      )}
    </div>
  );
}

