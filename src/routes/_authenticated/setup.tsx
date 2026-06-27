import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { DataLoadError } from "@/components/DataLoadError";
import { syncMinerWithCore } from "@/lib/trimlt.functions";
import { getDashboardData } from "@/lib/miner.functions";
import { isAuthSessionError, useAuthErrorHandler } from "@/hooks/useAuthErrorHandler";
import { Check, Copy, Download, Apple, Monitor, Terminal, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Setup — NODERIFT" }] }),
  component: Setup,
});

const DL_BASE = "https://api.vlonode.xyz/downloads/node";
const BIN = "trimlt-node"; // unix binary name
const BIN_WIN = "trimlt-node.exe";

const PLATFORMS = [
  { os: "Windows",         icon: Monitor,    href: `${DL_BASE}?os=windows&arch=amd64`, sub: "x64 · .exe" },
  { os: "macOS · Apple Silicon", icon: Apple, href: `${DL_BASE}?os=darwin&arch=arm64`,  sub: "M1 / M2 / M3" },
  { os: "macOS · Intel",   icon: Apple,      href: `${DL_BASE}?os=darwin&arch=amd64`,  sub: "x64" },
  { os: "Linux · x64",     icon: Terminal,   href: `${DL_BASE}?os=linux&arch=amd64`,   sub: "Most distros" },
  { os: "Linux · ARM64",   icon: Terminal,   href: `${DL_BASE}?os=linux&arch=arm64`,   sub: "Raspberry Pi, SBCs" },
  { os: "Android · Termux", icon: Smartphone, href: `${DL_BASE}?os=android&arch=arm64`, sub: "ARM64 · run in Termux" },
];

function Setup() {
  const queryClient = useQueryClient();
  const fetchData = useServerFn(getDashboardData);
  const sync = useServerFn(syncMinerWithCore);
  const { data, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchData(),
    refetchInterval: 3000,
    retry: (failureCount, queryError) => !isAuthSessionError(queryError) && failureCount < 2,
  });
  useAuthErrorHandler(error);

  const anyActive = data?.nodes.some(n => n.status === "ACTIVE") ?? false;
  const primaryNode = data?.nodes[0];
  const token = primaryNode?.miner_token ?? "<run-add-node-first>";

  const createNode = useMutation({
    mutationFn: () => sync({ data: { username: data?.profile?.email || "noderift-user", label: "My Node" } }),
    onSuccess: () => { toast.success("Node registered. Download your binary below to start."); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  useAuthErrorHandler(createNode.error);

  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => { if (anyActive && !celebrated) { setCelebrated(true); toast.success("Node connected — you are now earning 🎉"); } }, [anyActive, celebrated]);

  return (
    <AppShell anyNodeActive={anyActive}>
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-rift animate-soft-pulse" /> Setup
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Get Your Node Running</h1>
          <p className="mt-2 text-muted-foreground">Three steps. Ten minutes. Then your machine earns while you sleep.</p>
        </header>

        {error && !data && !isAuthSessionError(error) && <DataLoadError error={error} onRetry={() => refetch()} />}

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
        <StepCard step={1} title="Download for your device">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLATFORMS.map(p => (
              <a key={p.os} href={p.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background/40 hover:border-rift/40 hover:bg-rift/5 px-4 py-3.5 transition">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-pulse/15 text-pulse group-hover:bg-rift/15 group-hover:text-rift transition">
                  <p.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{p.os}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{p.sub}</div>
                </div>
                <Download size={16} className="text-muted-foreground group-hover:text-rift transition" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Single binary — no installer, no dependencies. About 7 MB.</p>
        </StepCard>

        {/* STEP 2 */}
        <StepCard step={2} title="Run it with your token">
          <div className="rounded-lg border border-rift/30 bg-rift/5 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-rift">One-liner deploy:</span> copy, paste, hit enter. Downloads, sets permissions, and starts your node — deploy and forget.
          </div>
          <Instruction
            label="Windows (PowerShell)"
            description="Open PowerShell anywhere and paste:"
            code={`iwr -Uri "${DL_BASE}?os=windows&arch=amd64" -OutFile ${BIN_WIN}; .\\${BIN_WIN} -token ${token}`}
          />
          <Instruction
            label="macOS · Apple Silicon"
            description="Open Terminal and paste:"
            code={`curl -L "${DL_BASE}?os=darwin&arch=arm64" -o ${BIN} && chmod +x ${BIN} && ./${BIN} -token ${token}`}
          />
          <Instruction
            label="macOS · Intel"
            description="Open Terminal and paste:"
            code={`curl -L "${DL_BASE}?os=darwin&arch=amd64" -o ${BIN} && chmod +x ${BIN} && ./${BIN} -token ${token}`}
          />
          <Instruction
            label="Linux · x64"
            description="Open a shell and paste:"
            code={`curl -L "${DL_BASE}?os=linux&arch=amd64" -o ${BIN} && chmod +x ${BIN} && ./${BIN} -token ${token}`}
          />
          <Instruction
            label="Linux · ARM64 (Raspberry Pi, SBCs)"
            description="Open a shell and paste:"
            code={`curl -L "${DL_BASE}?os=linux&arch=arm64" -o ${BIN} && chmod +x ${BIN} && ./${BIN} -token ${token}`}
          />
          <Instruction
            label="Android · Termux"
            description="Install Termux from F-Droid, open it, and paste:"
            code={`pkg install -y curl && curl -L "${DL_BASE}?os=android&arch=arm64" -o ${BIN} && chmod +x ${BIN} && ./${BIN} -token ${token}`}
          />
          <p className="text-xs text-muted-foreground">
            Leave the window open — as long as it stays running, your node is online and earning.
            Tip: on Linux, prepend <code className="text-rift">nohup</code> and append <code className="text-rift">&amp;</code> to keep it running after closing the terminal.
          </p>
        </StepCard>

        {/* STEP 3 */}
        <StepCard step={3} title="Verify connection">
          <div className="flex items-center gap-4 rounded-xl bg-background/40 p-4 border border-border">
            <div className="relative h-6 w-6 grid place-items-center">
              <span className={`absolute inset-0 rounded-full ${anyActive ? "bg-rift animate-node-pulse" : "bg-amber animate-soft-pulse"} opacity-70`} />
              <span className={`relative h-2 w-2 rounded-full ${anyActive ? "bg-rift" : "bg-amber"}`} />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {anyActive ? <span className="text-rift">Node connected — you are now earning</span> : "Waiting for your node to check in…"}
              </div>
              <div className="text-xs text-muted-foreground">This page refreshes every 5 seconds.</div>
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
    <section className="rounded-2xl border border-border bg-surface p-6 relative">
      <div className="flex items-center gap-3 mb-4">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-rift text-rift-foreground font-bold shadow-rift">{step}</span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
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
        <button onClick={copy} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied ? <Check size={16} className="text-rift" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function FAQ() {
  const items = [
    { q: "How much can I earn?", a: "Earnings depend on uptime, tier, and packets filtered. Most active nodes earn between $20 and $200 per month. Top operators with RIFT ELITE status earn more." },
    { q: "When do I get paid?", a: "Payouts process on the 1st of each month, or instantly when you withdraw on demand. Minimum withdrawal is $5." },
    { q: "Is my data safe?", a: "Yes. Every packet routed through your node is end-to-end encrypted with TLS 1.3. Buffers are wiped from memory after forwarding. You can never see, decrypt or store the data being processed." },
    { q: "What happens if my computer goes to sleep?", a: "Your node pauses and your uptime streak is at risk. Configure your OS to prevent sleep, or run on a device that stays awake (an old laptop, a Pi, or Termux on Android)." },
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
