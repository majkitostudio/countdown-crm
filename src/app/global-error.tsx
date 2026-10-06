"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootGlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[CRITICAL_ROOT_ERROR]", error);
  }, [error]);

  return (
    <html lang="cs" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-900/80 flex items-center justify-center text-rose-300">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-100">Kritická chyba systému</h1>
              <p className="text-xs text-zinc-400">Selhalo načtení základního rozvržení.</p>
            </div>
          </div>

          <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-200">
            {error.message || "Neočekávaná výjimka v kořenové komponentě."}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Obnovit systém
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
