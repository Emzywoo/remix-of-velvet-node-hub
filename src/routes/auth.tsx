import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — NODERIFT" }] }),
  component: AuthPage,
});

const COUNTRIES = ["United States","United Kingdom","Canada","Germany","France","Spain","Italy","Netherlands","Nigeria","Kenya","South Africa","Egypt","Brazil","Mexico","Argentina","India","Philippines","Indonesia","Vietnam","Japan","Singapore","Australia","Other"];

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", country: "United States" });

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.password !== form.confirm) throw new Error("Passwords don't match");
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters");
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: form.full_name, country: form.country },
          },
        });
        if (error) throw error;
        // Auto sign-in (cloud projects default to no email confirmation)
        const { error: signErr } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (signErr) throw signErr;
        toast.success("Welcome to NODERIFT");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 py-5">
        <Link to="/"><Logo /></Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex rounded-lg bg-background p-1 text-sm">
            <button onClick={() => setMode("login")} className={`flex-1 rounded-md py-2 font-medium transition ${mode === "login" ? "bg-surface-2 text-foreground" : "text-muted-foreground"}`}>Sign In</button>
            <button onClick={() => setMode("register")} className={`flex-1 rounded-md py-2 font-medium transition ${mode === "register" ? "bg-surface-2 text-rift" : "text-muted-foreground"}`}>Start Earning</button>
          </div>

          <form onSubmit={handle} className="mt-6 space-y-4">
            {mode === "register" && (
              <Field label="Full name">
                <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift" />
              </Field>
            )}
            <Field label="Email">
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift" />
            </Field>
            <Field label="Password">
              <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift" />
            </Field>
            {mode === "register" && (
              <>
                <Field label="Confirm password">
                  <input type="password" required value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift" />
                </Field>
                <Field label="Country">
                  <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-rift">
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </>
            )}
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-rift py-3 font-semibold text-rift-foreground shadow-rift hover:opacity-90 disabled:opacity-50 transition">
              {loading ? "Working…" : mode === "register" ? "Create account & start earning" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
