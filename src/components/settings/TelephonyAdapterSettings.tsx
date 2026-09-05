"use client";

import Link from "next/link";
import { Phone, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getWorkspaceTelephonySettingsAction,
  updateWorkspaceTelephonyAdapterAction,
} from "@/app/actions/telephonySettings";
import { TELNYX_BLOCKER_COPY, type SelectableTelephonyAdapter } from "@/lib/telephony/telephonyAdapter";
import type { WorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";

export function TelephonyAdapterSettings() {
  const [settings, setSettings] = useState<WorkspaceTelephonySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void getWorkspaceTelephonySettingsAction()
      .then((nextSettings) => {
        if (isCurrent) setSettings(nextSettings);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Telephony settings could not be loaded.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const selectAdapter = async (adapter: SelectableTelephonyAdapter) => {
    if (adapter === "telnyx") return;
    setIsSaving(true);
    setError(null);
    try {
      setSettings(await updateWorkspaceTelephonyAdapterAction(adapter));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Telephony settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section id="telephony-adapter" className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-7 shadow-sm space-y-5">
      <div className="flex items-start gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300">
          <Phone className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Telephony adapter</h2>
          <p className="text-[11px] text-zinc-400">Workspace-wide provider used by the Operator Console.</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-zinc-400">Loading telephony adapter...</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => void selectAdapter("local_sip")}
              disabled={isSaving}
              aria-pressed={settings?.active_adapter === "local_sip"}
              className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 text-left transition hover:border-zinc-500 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="block text-xs font-semibold text-zinc-100">Local SIP</span>
              <span className="mt-1 block text-[11px] text-zinc-400">Local Asterisk in Docker for internal test calls.</span>
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-xl border border-amber-900/60 bg-amber-950/10 p-4 text-left opacity-70"
            >
              <span className="block text-xs font-semibold text-zinc-300">Telnyx adapter</span>
              <span className="mt-1 block text-[11px] text-amber-300">{TELNYX_BLOCKER_COPY}</span>
            </button>
          </div>

          {settings?.active_adapter === "local_sip" ? (
            <Link href="/telephony" className="inline-flex items-center rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white">
              Open Local SIP console
            </Link>
          ) : (
            <Link href="/settings#telephony-adapter" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200">
              <ShieldAlert className="h-3.5 w-3.5" />
              Local SIP is not active. Enable Local SIP in Admin Settings to use this page.
            </Link>
          )}

          {settings?.active_adapter === "simulation" && (
            <p className="text-[11px] text-zinc-500">Simulation remains the safe fallback until Local SIP is selected.</p>
          )}
          {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </section>
  );
}
