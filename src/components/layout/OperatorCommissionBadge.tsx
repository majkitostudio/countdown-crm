"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { sounds } from "@/lib/audio";
import { getCurrentOperatorCommissionAction } from "@/app/actions/wallet";

export function OperatorCommissionBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("CZK");
  const [isBumping, setIsBumping] = useState(false);
  const [lastBonus, setLastBonus] = useState(150);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Načtení výchozího stavu z peněženky/provizí
  useEffect(() => {
    let cancelled = false;
    void getCurrentOperatorCommissionAction()
      .then((data) => {
        if (!cancelled) {
          setBalance(data.balance);
          setCurrency(data.currency);
        }
      })
      .catch((err) => {
        console.warn("[OperatorCommissionBadge] Could not load initial balance:", err);
        if (!cancelled) setBalance(0);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Posluchač na událost připsání provize při vytvoření objednávky
  useEffect(() => {
    const handleCommissionEarned = (event: Event) => {
      const customEvent = event as CustomEvent<{ amount?: number }>;
      const addedAmount = customEvent.detail?.amount ?? 150;

      setLastBonus(addedAmount);
      setBalance((prev) => (prev !== null ? prev + addedAmount : addedAmount));

      // Wall Street Terminal dopaminový zvuk
      sounds.playWallStreetChime();

      // Vizuální smaragdový puls
      setIsBumping(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsBumping(false);
      }, 2500);
    };

    window.addEventListener("countdown:order_commission_earned", handleCommissionEarned);
    return () => {
      window.removeEventListener("countdown:order_commission_earned", handleCommissionEarned);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Formátování měny
  const formattedAmount = (balance ?? 0).toLocaleString("cs-CZ");
  const currencySymbol = currency === "CZK" ? "Kč" : currency === "EUR" ? "€" : currency;

  return (
    <Link
      href="/wallet"
      title="Zobrazit přehled provizí a peněženku"
      className={`relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        isBumping
          ? "border-emerald-500/60 bg-emerald-950/40 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/40"
          : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-800/60"
      }`}
    >
      <TrendingUp
        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
          isBumping ? "text-emerald-400" : "text-zinc-400"
        }`}
        aria-hidden="true"
      />

      <div className="min-w-0">
        <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-wider text-zinc-400 leading-none">
          Provize
        </span>
        <span className="text-xs font-bold font-mono text-zinc-100 tabular-nums leading-tight">
          {balance === null ? "—" : `${formattedAmount} ${currencySymbol}`}
        </span>
      </div>

      {/* Plovoucí dopaminový odznak při připsání */}
      {isBumping && (
        <span className="absolute -top-2.5 -right-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-1.5 py-0.5 text-[10px] font-bold font-mono text-emerald-300 shadow-md animate-in fade-in zoom-in duration-150">
          +{lastBonus} {currencySymbol}
        </span>
      )}
    </Link>
  );
}
