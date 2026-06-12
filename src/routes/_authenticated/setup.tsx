import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { syncMinerWithCore } from "@/lib/trimlt.functions";
import { getDashboardData } from "@/lib/miner.functions";
import { Check, Copy, Download, Apple, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Setup — NODERIFT" }] }),
  component: Setup,
});

function Setup() {
  const queryClient = useQueryClient();
  const fetchData = useServerFn(getDashboardData);
  const sync = useServerFn(syncMinerWithCore);
  const { data, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchData(), refetchInterval: 5000 });

  const anyActive = data?.nodes.some(n => n.status === "ACTIVE") ?? false;
  const primaryNode = data?.nodes[0];
  const token = primaryNode?.miner_token ?? "<run-add-node-first>";

  const createNode = useMutation({
    mutationFn: () => sync({ data: { username: data?.profile?.email || "noderift-user", label: "My Node" } }),
    onSuccess: () => { toast.success("Node registered. Download below to start."); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Confetti once when first node goes ACTIVE
  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => { if (anyActive && !celebrated) { setCelebrated(true); toast.success("Node connected — you are now earning 🎉"); } }, [anyActive, celebrated]);

  return (
    <AppShell anyNodeActive={anyActive}>
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-bold">Get Your Node Running</h1>
          <p className="mt-2 text-muted-foreground">Three steps. Ten minutes. Start earning.</p>
        </header>

        {!primaryNode && (
          <div className="rounded-xl border border-amber/40 bg-amber/10 p-4 flex items-center justify-between gap-4">
            <div className="text-sm">You don't have a node registered yet. Generate one to get your unique token.</div>
            <button onClick={() => createNode.mutate()} disabled={createNode.isPending}
              className="rounded-lg bg-rift px-4 py-2 text-sm font-semibold text-rift-foreground disabled:opacity-50">
              {createNode.isPending ? "Generating…" : "Generate node"}
            </button>
          </div>
        )}

        {/* STEP 1 */}
        <StepCard step={1} title="Download Your Node">
          <div className="grid grid-cols-2 gap-3">
            <DLButton os="Windows" icon={<Monitor size={18} />} url="https://api.vlonode.xyz/api/v1/external/download/windows" />
            <DLButton os="Mac · Apple Silicon" icon={<Apple size={18} />} url="https://api.vlonode.xyz/api/v1/external/download/mac-arm" />
            <DLButton os="Mac · Intel" icon={<Apple size={18} />} url="https://api.vlonode.xyz/api/v1/external/download/mac-intel" />
            <DLButton os="Linux" icon={<Download size={18} />} url="https://api.vlonode.xyz/api/v1/external/download/linux" />
          </div>
        </StepCard>

        {/* STEP 2 */}
        <StepCard step={2} title="Install & Run">
          <Instruction
            label="Windows"
            description="Double-click the installer and click Next. The node runs in the background after install."
            code={`noderift-cli.exe start --token ${token}`}
          />
          <Instruction
            label="Mac"
            description="Open Terminal and paste this command:"
            code={`curl -fsSL https://api.vlonode.xyz/install.sh | bash -s -- --token ${token}`}
          />
          <Instruction
            label="Linux"
            description="Run this in your shell:"
            code={`curl -fsSL https://api.vlonode.xyz/install.sh | sudo bash -s -- --token ${token}`}
          />
        </StepCard>

        {/* STEP 3 */}
        <StepCard step={3} title="Verify Connection">
          <div className="flex items-center gap-4">
            <div className="relative h-5 w-5">
              <span className={`absolute inset-0 rounded-full ${anyActive ? "bg-rift animate-node-pulse" : "bg-amber animate-soft-pulse"}`} />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {anyActive ? <span className="text-rift">Node Connected — you are now earning</span> : "Waiting for connection…"}
              </div>
              <div className="text-xs text-muted-foreground">Checks every 5 seconds. This page updates automatically.</div>
            </div>
            <button onClick={() => refetch()} className="text-xs text-pulse hover:underline">Refresh now</button>
          </div>
        </StepCard>

        <FAQ />
      </div>
    </AppShell>
  );
}

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-rift text-rift-foreground font-bold">{step}</span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DLButton({ os, icon, url }: { os: string; icon: React.ReactNode; url: string }) {
  return (
    <a href={url} className="flex items-center gap-3 rounded-xl bg-pulse/15 border border-pulse/30 px-4 py-4 hover:bg-pulse/25 transition">
      <span className="text-pulse">{icon}</span>
      <span className="font-medium text-sm">{os}</span>
    </a>
  );
}

function Instruction({ label, description, code }: { label: string; description: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-3">
        <code className="flex-1 font-mono text-xs text-rift overflow-x-auto whitespace-nowrap">{code}</code>
        <button onClick={copy} className="text-muted-foreground hover:text-foreground">
          {copied ? <Check size={16} className="text-rift" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function FAQ() {
  const items = [
    { q: "How much can I earn?", a: "Earnings depend on uptime, tier, and packets filtered. Most active nodes earn between $20 and $200 per month. Top operators with RIFT ELITE status earn more." },
    { q: "When do I get paid?", a: "Payouts are processed on the 1st of each month, or instantly when you withdraw on demand. Minimum withdrawal is $5." },
    { q: "Is my data safe?", a: "Yes. Every packet routed through your node is end-to-end encrypted with TLS 1.3. Buffers are wiped from memory after forwarding. You can never see, decrypt or store the data being processed." },
    { q: "What happens if my computer goes to sleep?", a: "Your node will pause and your uptime streak is at risk. Configure your OS to prevent sleep, or run on a device that stays awake." },
    { q: "Can I run multiple nodes?", a: "Yes — add as many as your hardware can support. Each earns independently. Add nodes from Settings." },
  ];
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold mb-2">Questions</h2>
      <div className="divide-y divide-border">
        {items.map((it, i) => (
          <details key={i} className="py-3 group">
            <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
              {it.q}
              <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
