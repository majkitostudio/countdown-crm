"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { LocalSipAdapter, type LocalSipState } from "@/lib/telephony/localSipAdapter";
import { prepareLocalSipTestCall } from "@/lib/telephony/localSipTestCallClient";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface LocalTelephonyStatus {
  activeAdapter: WorkspaceTelephonySettings["active_adapter"];
  asterisk: "Available" | "Unavailable";
  extensions: string[];
  extensionRegistration: Array<{ extension: string; status: string }>;
  activeCalls: Array<{
    id: string;
    provider: string;
    direction: string;
    status: string;
    leadId: string | null;
    operatorId: string | null;
    toNumber: string | null;
    startedAt: string | null;
    createdAt: string;
  }>;
  recentEvents: Array<{
    id: string;
    sessionId: string | null;
    provider: string;
    eventType: string;
    occurredAt: string | null;
    createdAt: string;
  }>;
}

type TestCallState = LocalSipState | "idle";

const CALL_STATE_LABELS: Record<string, string> = {
  idle: "Připraveno",
  initiated: "Zahajování",
  ringing: "Vyzvánění",
  connected: "Spojeno",
  held: "Přidrženo",
  ended: "Ukončeno",
  failed: "Chyba",
  cancelled: "Zrušeno",
  busy: "Obsazeno",
  no_answer: "Bez odpovědi",
};

const REGISTRATION_LABELS: Record<string, string> = {
  configured: "Nastaveno",
  registered: "Registrováno",
  unregistered: "Neregistrováno",
  unknown: "Neznámý stav",
  checking: "Kontrola…",
};

const PROVIDER_LABELS: Record<string, string> = {
  local_sip: "Místní SIP",
  simulator: "Simulace",
};

const EVENT_LABELS: Record<string, string> = {
  "local_sip.session.initiated": "Zahájení hovoru",
  "local_sip.session.ringing": "Vyzvánění",
  "local_sip.session.connected": "Spojení hovoru",
  "local_sip.session.held": "Přidržení hovoru",
  "local_sip.session.ended": "Ukončení hovoru",
  "local_sip.session.failed": "Chyba hovoru",
};

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("cs-CZ") : "—";
}

export function TelephonyAdminPanel({ settings }: { settings: WorkspaceTelephonySettings }) {
  const [status, setStatus] = useState<LocalTelephonyStatus | null>(null);
  const [isTestCallPending, setIsTestCallPending] = useState(false);
  const [testCallState, setTestCallState] = useState<TestCallState>("idle");
  const [testCallError, setTestCallError] = useState<string | null>(null);
  const testAdapterRef = useRef<LocalSipAdapter | null>(null);
  const testSessionIdRef = useRef<string | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void fetch("/api/telephony/local/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Stav není dostupný");
        return response.json() as Promise<LocalTelephonyStatus>;
      })
      .then((nextStatus) => {
        if (isCurrent) setStatus(nextStatus);
      })
      .catch(() => {
        if (isCurrent) {
          setStatus({
            activeAdapter: settings.active_adapter,
            asterisk: "Unavailable",
            extensions: ["1001", "1002"],
            extensionRegistration: [
              { extension: "1001", status: "unknown" },
              { extension: "1002", status: "unknown" },
            ],
            activeCalls: [],
            recentEvents: [],
          });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [settings.active_adapter]);

  useEffect(() => {
    return () => {
      const adapter = testAdapterRef.current;
      if (adapter) void adapter.disconnect().catch(() => undefined);
      testAudioRef.current?.remove();
    };
  }, []);

  async function syncTestSession(statusValue: LocalSipState) {
    const sessionId = testSessionIdRef.current;
    if (!sessionId) return;
    await fetch("/api/telephony/local/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, status: statusValue }),
    }).catch(() => undefined);
  }

  async function finishTestCall() {
    const adapter = testAdapterRef.current;
    setIsTestCallPending(true);
    try {
      if (adapter) await adapter.hangup();
      await syncTestSession("ended");
    } catch (error) {
      setTestCallError(error instanceof Error ? error.message : "Interní testovací hovor se nepodařilo ukončit.");
    } finally {
      setTestCallState("ended");
      setIsTestCallPending(false);
    }
  }

  async function startTestCall() {
    if (isTestCallPending || testAdapterRef.current || testCallState === "initiated" || testCallState === "ringing" || testCallState === "connected" || testCallState === "held") return;
    setIsTestCallPending(true);
    setTestCallError(null);
    try {
      const preparedCall = await prepareLocalSipTestCall({
        onState: (nextState) => {
          setTestCallState(nextState);
          void syncTestSession(nextState);
          if (nextState === "ended" || nextState === "failed") {
            testAdapterRef.current = null;
            void preparedCall.adapter.disconnect().catch(() => undefined);
          }
        },
        onError: (error) => {
          setTestCallError(error.message);
          setTestCallState("failed");
        },
      });
      testAudioRef.current = preparedCall.audio;
      testSessionIdRef.current = preparedCall.sessionId;
      const adapter = preparedCall.adapter;
      testAdapterRef.current = adapter;
      await adapter.dial(`sip:${preparedCall.toExtension}@127.0.0.1`);
    } catch (error) {
      setTestCallState("failed");
      setTestCallError(error instanceof Error ? error.message : "Interní testovací hovor se nepodařilo spustit.");
      await syncTestSession("failed");
      testAdapterRef.current = null;
    } finally {
      setIsTestCallPending(false);
    }
  }

  const testCallActive = testCallState === "initiated" || testCallState === "ringing" || testCallState === "connected" || testCallState === "held";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Aktivní adaptér" value={settings.active_adapter === "local_sip" ? "Místní SIP" : "Simulace"} />
        <MetricCard
          label="Stav Asterisku"
          value={status?.asterisk === "Available" ? "Dostupné" : status?.asterisk === "Unavailable" ? "Nedostupné" : "Kontrola..."}
          valueTone={status?.asterisk === "Available" ? "success" : status?.asterisk === "Unavailable" ? "danger" : "neutral"}
        />
        <MetricCard
          label="Interní linky"
          value="1001 / 1002"
          detail={(status?.extensionRegistration || [{ extension: "1001", status: "checking" }, { extension: "1002", status: "checking" }]).map((item) => `${item.extension}: ${REGISTRATION_LABELS[item.status] || item.status}`).join(" · ")}
        />
      </section>

      <Surface variant="page"><div className="p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Meze místního SIP</h2>
        <div className="mt-4 grid gap-3 text-xs text-zinc-300 sm:grid-cols-2">
          <p>Pouze místní</p>
          <p>Veřejná PSTN zakázána</p>
          <p>Nahrávání zakázáno</p>
          <p>Telnyx zablokován</p>
        </div>
      </div></Surface>

      <Surface variant="page"><div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Interní testovací hovor</h2>
            <p className="mt-2 text-xs text-zinc-400">Zvukový test v prohlížeči mezi místními linkami 1001 a 1002. Nepoužívá se žádné veřejné číslo.</p>
          </div>
          {testCallActive ? (
            <Button variant="danger" onClick={() => void finishTestCall()} disabled={isTestCallPending}>
              {isTestCallPending ? "Ukončování…" : "Ukončit testovací hovor"}
            </Button>
          ) : (
            <Button onClick={() => void startTestCall()} disabled={isTestCallPending || status?.asterisk !== "Available"}>
              {isTestCallPending ? "Spouštění…" : "Volat 1002 z 1001"}
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-400">Stav: <span className="font-mono text-zinc-200">{CALL_STATE_LABELS[testCallState] || testCallState}</span></p>
        {testCallError && <StatusAlert tone="danger" className="w-full">{testCallError}</StatusAlert>}
      </div></Surface>

      <Surface variant="page"><div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-100">Aktivní hovory</h2>
          <span className="text-xs text-zinc-500">{status?.activeCalls.length ?? 0}</span>
        </div>
        {(status?.activeCalls.length ?? 0) === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">Žádné aktivní místní ani poskytovatelské hovory.</p>
        ) : (
          <div className="mt-3 space-y-2 text-xs text-zinc-300">
            {status?.activeCalls.map((call) => (
              <div key={call.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <span className="font-mono text-zinc-400">{PROVIDER_LABELS[call.provider] || call.provider} · {CALL_STATE_LABELS[call.status] || call.status}</span>
                <span>{call.toNumber || "interní"}</span>
                <span className="text-zinc-500">{formatTime(call.startedAt || call.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div></Surface>

      <Surface variant="page"><div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-100">Nedávné události</h2>
          <span className="text-xs text-zinc-500">{status?.recentEvents.length ?? 0}</span>
        </div>
        {(status?.recentEvents.length ?? 0) === 0 ? (
          <p className="mt-3 text-xs text-zinc-500">Žádné nedávné telekomunikační události.</p>
        ) : (
          <div className="mt-3 space-y-2 text-xs text-zinc-300">
            {status?.recentEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <span className="font-mono text-zinc-400">{PROVIDER_LABELS[event.provider] || event.provider}</span>
                <span>{EVENT_LABELS[event.eventType] || event.eventType}</span>
                <span className="text-zinc-500">{formatTime(event.occurredAt || event.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div></Surface>
    </div>
  );
}
