"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import {
  registerPushSubscriptionAction,
  removePushSubscriptionAction,
} from "@/app/actions/pushNotifications";

type PushState = "checking" | "ready" | "enabled" | "denied" | "unavailable" | "busy" | "error";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData, (character) => character.charCodeAt(0)));
}

function isPushSupported(): boolean {
  return Boolean(
    vapidPublicKey &&
      window.isSecureContext &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window,
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/push-sw.js");
}

export function PushReminderSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      if (!isPushSupported()) {
        if (!cancelled) setState("unavailable");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setState(subscription ? "enabled" : "ready");
      } catch {
        if (!cancelled) setState("ready");
      }
    };

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setState("busy");
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        setMessage("Přístup k notifikacím nebyl povolen.");
        return;
      }

      const registration = await getRegistration();
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        }));
      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("Browser nevrátil kompletní push subscription.");
      }

      await registerPushSubscriptionAction({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      });
      setState("enabled");
      setMessage("Push připomínky jsou zapnuté.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Push připomínky se nepodařilo zapnout.");
    }
  };

  const disable = async () => {
    setState("busy");
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("ready");
      setMessage("Push připomínky jsou vypnuté.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Push připomínky se nepodařilo vypnout.");
    }
  };

  if (state === "unavailable") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-xs text-zinc-500">
        Push připomínky nejsou v tomto prohlížeči nebo prostředí dostupné.
      </div>
    );
  }

  const isBusy = state === "checking" || state === "busy";
  const isEnabled = state === "enabled";
  const isDenied = state === "denied";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-950/50 p-2 text-violet-300">
          {isEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-200">Push připomínky</div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
            Upozornění na osobní reminders i mimo otevřený kalendář. Povolení se uděluje pouze po kliknutí.
          </p>
          {message && <p className="mt-2 text-xs text-zinc-400" role="status">{message}</p>}
          {isDenied && (
            <p className="mt-2 text-xs text-amber-300">Povolení je blokované v nastavení prohlížeče.</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void (isEnabled ? disable() : enable())}
        disabled={isBusy || isDenied}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBusy && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
        {isEnabled ? "Vypnout push" : "Zapnout push"}
      </button>
    </div>
  );
}
