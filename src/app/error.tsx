"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { StatusAlert } from "@/components/ui/Status";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console with sanitized context
    console.error("[CRITICAL_APP_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <Surface variant="page" className="max-w-md w-full p-6 space-y-5 border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-900/80 flex items-center justify-center text-rose-300">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Nastala neočekávaná chyba</h1>
            <p className="text-xs text-zinc-400">Pracovní relace byla bezpečně pozastavena.</p>
          </div>
        </div>

        <StatusAlert tone="danger">
          <p className="text-xs font-semibold text-rose-200">
            {error.message || "Došlo k systémové výjimce v klientské aplikaci."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-[10px] text-rose-300/70">
              Kód incidentu: {error.digest}
            </p>
          )}
        </StatusAlert>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Vaše uložená data v CRM zůstala nedotčena. Můžete zkusit obnovit tuto obrazovku nebo se vrátit do hlavního panelu.
        </p>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="primary" onClick={() => reset()} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Zkusit znovu
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              router.push("/");
            }}
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-1.5" />
            Hlavní panel
          </Button>
        </div>
      </Surface>
    </div>
  );
}
