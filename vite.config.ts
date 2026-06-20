// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Detect Vercel build environment so we can target their nitro preset.
// In the Lovable sandbox this option is overridden internally to cloudflare-module.
import { existsSync, readFileSync } from "node:fs";

const isVercel = !!process.env.VERCEL;

function readProductionEnv() {
  if (!existsSync(".env.production")) return {} as Record<string, string>;
  return Object.fromEntries(
    readFileSync(".env.production", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").replace(/^['\"]|['\"]$/g, "")];
      }),
  );
}

const productionEnv = readProductionEnv();
const supabaseUrl = process.env.SUPABASE_URL || productionEnv.SUPABASE_URL || productionEnv.VITE_SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || productionEnv.SUPABASE_PUBLISHABLE_KEY || productionEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

export default defineConfig({
  vite: {
    define: {
      ...(supabaseUrl ? { "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl) } : {}),
      ...(supabasePublishableKey ? { "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey) } : {}),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
});
