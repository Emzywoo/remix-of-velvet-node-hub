import { ReactNode, useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings as SettingsIcon } from "lucide-react";

export function AppShell({ children, anyNodeActive }: { children: ReactNode; anyNodeActive?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const statusColor = anyNodeActive ? "bg-rift" : "bg-danger";
  const statusLabel = anyNodeActive ? "All Systems Active" : "Node Offline";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/dashboard"><Logo /></Link>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusColor}`}>
              {anyNodeActive && <span className="absolute inset-0 rounded-full animate-node-pulse" />}
            </span>
            <span className={anyNodeActive ? "text-rift" : "text-danger"}>{statusLabel}</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/dashboard" className="rounded-md px-3 py-1.5 hover:bg-surface-2" activeProps={{ className: "rounded-md px-3 py-1.5 bg-surface-2 text-rift" }}>Dashboard</Link>
            <Link to="/setup" className="hidden sm:inline rounded-md px-3 py-1.5 hover:bg-surface-2" activeProps={{ className: "rounded-md px-3 py-1.5 bg-surface-2 text-rift" }}>Setup</Link>
            <Link to="/earnings" className="hidden sm:inline rounded-md px-3 py-1.5 hover:bg-surface-2" activeProps={{ className: "rounded-md px-3 py-1.5 bg-surface-2 text-rift" }}>Earnings</Link>
            <Link to="/leaderboard" className="hidden md:inline rounded-md px-3 py-1.5 hover:bg-surface-2" activeProps={{ className: "rounded-md px-3 py-1.5 bg-surface-2 text-rift" }}>Leaderboard</Link>
            <Link to="/settings" className="rounded-md p-1.5 hover:bg-surface-2" title="Settings"><SettingsIcon size={18} /></Link>
            <button onClick={handleSignOut} className="rounded-md p-1.5 hover:bg-surface-2" title={email || "Sign out"}><LogOut size={18} /></button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">{children}</main>
    </div>
  );
}
