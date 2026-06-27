import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardData, removeNode, updateProfile } from "@/lib/miner.functions";
import { syncMinerWithCore } from "@/lib/trimlt.functions";
import { AppShell } from "@/components/AppShell";
import { DataLoadError } from "@/components/DataLoadError";
import { isAuthSessionError, useAuthErrorHandler } from "@/hooks/useAuthErrorHandler";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — NODERIFT" }] }),
  component: Settings,
});

function Settings() {
  const queryClient = useQueryClient();
  const fetchData = useServerFn(getDashboardData);
  const updProfile = useServerFn(updateProfile);
  const remove = useServerFn(removeNode);
  const sync = useServerFn(syncMinerWithCore);
  const { data, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchData(),
    retry: (failureCount, queryError) => !isAuthSessionError(queryError) && failureCount < 2,
  });
  const anyActive = data?.nodes.some(n => n.status === "ACTIVE") ?? false;
  const [form, setForm] = useState({ full_name: "", country: "", sound_enabled: false, notify_offline: true, notify_tier: true, notify_payout: true });
  useAuthErrorHandler(error);

  useEffect(() => {
    if (data?.profile) setForm({
      full_name: data.profile.full_name || "",
      country: data.profile.country || "",
      sound_enabled: !!data.profile.sound_enabled,
      notify_offline: !!data.profile.notify_offline,
      notify_tier: !!data.profile.notify_tier,
      notify_payout: !!data.profile.notify_payout,
    });
  }, [data?.profile]);

  const save = useMutation({
    mutationFn: () => updProfile({ data: form }),
    onSuccess: () => { toast.success("Saved"); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const addNode = useMutation({
    mutationFn: () => sync({ data: { username: data?.profile?.email || "noderift-user", label: `Node ${(data?.nodes.length ?? 0) + 1}` } }),
    onSuccess: () => { toast.success("Node added"); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { node_id: id } }),
    onSuccess: () => { toast.success("Node removed"); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  useAuthErrorHandler(save.error || addNode.error || del.error);

  return (
    <AppShell anyNodeActive={anyActive}>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        {error && !data && !isAuthSessionError(error) && <DataLoadError error={error} onRetry={() => refetch()} />}

        <Section title="Account">
          <Row label="Full name">
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="settings-input" />
          </Row>
          <Row label="Email">
            <div className="text-sm text-muted-foreground py-2">{data?.profile?.email}</div>
          </Row>
          <Row label="Country">
            <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="settings-input" />
          </Row>
        </Section>

        <Section title="Notifications">
          <Toggle label="Email me when my node goes offline" checked={form.notify_offline} onChange={v => setForm({ ...form, notify_offline: v })} />
          <Toggle label="Email me when I reach a new tier" checked={form.notify_tier} onChange={v => setForm({ ...form, notify_tier: v })} />
          <Toggle label="Email me on payout completion" checked={form.notify_payout} onChange={v => setForm({ ...form, notify_payout: v })} />
          <Toggle label="Play a tick sound when earnings update" checked={form.sound_enabled} onChange={v => setForm({ ...form, sound_enabled: v })} />
        </Section>

        <div className="flex justify-end">
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="rounded-lg bg-rift px-5 py-2.5 font-semibold text-rift-foreground shadow-rift disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>

        <Section title="Nodes" action={
          <button onClick={() => addNode.mutate()} disabled={addNode.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-pulse/15 border border-pulse/30 px-3 py-1.5 text-sm text-pulse hover:bg-pulse/25 disabled:opacity-50">
            <Plus size={14} /> Add node
          </button>
        }>
          {(data?.nodes ?? []).length === 0 && <div className="text-sm text-muted-foreground">No nodes registered.</div>}
          <div className="divide-y divide-border">
            {(data?.nodes ?? []).map(n => (
              <div key={n.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-mono text-sm">{n.miner_token.slice(0, 16)}…</div>
                  <div className="text-xs text-muted-foreground">{n.label} · {n.region} · {n.status}</div>
                </div>
                <button onClick={() => del.mutate(n.id)} className="text-muted-foreground hover:text-danger p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <style>{`.settings-input { width: 100%; border-radius: 0.5rem; border: 1px solid var(--border); background: var(--background); padding: 0.5rem 0.75rem; outline: none; } .settings-input:focus { border-color: var(--rift); }`}</style>
    </AppShell>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>{action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-1.5">
      <span className="text-sm">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-rift" : "bg-surface-2"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
