"use client";

import { useEffect, useState } from "react";
import type { WorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";

interface LocalTelephonyStatus {
  activeAdapter: WorkspaceTelephonySettings["active_adapter"];
  asterisk: "Available" | "Unavailable";
  extensions: string[];
}

export function TelephonyAdminPanel({ settings }: { settings: WorkspaceTelephonySettings }) {
  const [status, setStatus] = useState<LocalTelephonyStatus | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void fetch("/api/telephony/local/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<LocalTelephonyStatus>)
      .then((nextStatus) => {
        if (isCurrent) setStatus(nextStatus);
      })
      .catch(() => {
        if (isCurrent) setStatus({ activeAdapter: settings.active_adapter, asterisk: "Unavailable", extensions: ["1001", "1002"] });
      });
    return () => {
      isCurrent = false;
    };
  }, [settings.active_adapter]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Active adapter</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{settings.active_adapter === "local_sip" ? "Local SIP" : "Simulation"}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Asterisk status</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">{status?.asterisk || "Checking..."}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Internal extensions</p>
          <p className="mt-2 text-sm font-semibold text-zinc-100">1001 / 1002</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Local SIP boundaries</h2>
        <div className="mt-4 grid gap-3 text-xs text-zinc-300 sm:grid-cols-2">
          <p>Local only</p>
          <p>Public PSTN disabled</p>
          <p>Recording disabled</p>
          <p>Telnyx blocked</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Test call</h2>
        <p className="mt-2 text-xs text-zinc-400">Internal test call controls will be enabled after the Local SIP adapter and Asterisk endpoints are connected.</p>
      </section>
    </div>
  );
}
