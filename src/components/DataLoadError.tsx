import { AlertTriangle, RefreshCw } from "lucide-react";
import { getErrorMessage } from "@/hooks/useAuthErrorHandler";

export function DataLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <section className="rounded-2xl border border-danger/30 bg-surface p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger">
          <AlertTriangle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Data could not load</h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    </section>
  );
}