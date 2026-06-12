import { Crown } from "lucide-react";

export function TierBadge({ tier }: { tier: number }) {
  if (tier === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider shadow-elite"
        style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", color: "#1a1300" }}>
        <Crown size={11} /> RIFT ELITE
      </span>
    );
  }
  if (tier === 2) {
    return (
      <span className="inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider"
        style={{ background: "linear-gradient(135deg,#C0C0C0,#8C8C8C)", color: "#101010" }}>
        CORE NODE
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md border border-border px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
      NODE
    </span>
  );
}
