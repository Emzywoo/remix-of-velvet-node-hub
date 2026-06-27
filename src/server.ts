import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Bulletproof env bootstrap: the Supabase URL + publishable (anon) key are
// PUBLIC values (same as VITE_SUPABASE_*). Ship them as hard runtime
// fallbacks so server functions work on ANY host (Vercel, Cloudflare, etc.)
// even if the build-time `define` injection or dashboard env vars are absent.
// The service-role key is never included here.
const PUBLIC_SUPABASE_URL = "https://sykqbwmbunubwslebbcl.supabase.co";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5a3Fid21idW51YndzbGViYmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODgxNDIsImV4cCI6MjA5NzQ2NDE0Mn0.s2hX3Xe9Y2T4s7orPCxZMbYHMQmFXle8n1CwZr8gmm0";
if (typeof process !== "undefined" && process.env) {
  if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = PUBLIC_SUPABASE_URL;
  if (!process.env.SUPABASE_PUBLISHABLE_KEY) process.env.SUPABASE_PUBLISHABLE_KEY = PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}


type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
