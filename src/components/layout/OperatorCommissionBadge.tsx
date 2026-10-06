"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { sounds } from "@/lib/audio";
import { getCurrentOperatorCommissionAction } from "@/app/actions/wallet";

export function OperatorCommissionBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [displayBalance, setDisplayBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("CZK");
  const [isBumping, setIsBumping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Načtení výchozího stavu z peněženky/provizí
  useEffect(() => {
    let cancelled = false;
    void getCurrentOperatorCommissionAction()
      .then((data) => {
        if (!cancelled) {
          setBalance(data.balance);
          setDisplayBalance(data.balance);
          setCurrency(data.currency);
        }
      })
      .catch((err) => {
        console.warn("[OperatorCommissionBadge] Could not load initial balance:", err);
        if (!cancelled) {
          setBalance(0);
          setDisplayBalance(0);
        }
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

      // 1. Zvuk: Wall Street Terminal dopaminový signál
      sounds.playWallStreetChime();

      // 2. Vizuální rozsvícení zeleně na malý moment
      setIsBumping(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsBumping(false);
      }, 1800);

      // 3. Plynulá animace přepočítání (roll-up tickeru z aktuální hodnoty na cílovou)
      setBalance((currentBalance) => {
        const startVal = displayBalance ?? currentBalance ?? 0;
        const targetVal = (currentBalance ?? 0) + addedAmount;
        const duration = 750; // ms
        const startTime = performance.now();

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        const step = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Ease-out cubic pro přirozené zpomalení u cílové částky
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = Math.round(startVal + (targetVal - startVal) * easeOut);

          setDisplayBalance(currentVal);

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(step);
          } else {
            setDisplayBalance(targetVal);
          }
        };

        animFrameRef.current = requestAnimationFrame(step);
        return targetVal;
      });
    };

    window.addEventListener("countdown:order_commission_earned", handleCommissionEarned);
    return () => {
      window.removeEventListener("countdown:order_commission_earned", handleCommissionEarned);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [displayBalance]);

  // Formátování měny
  const formattedAmount = (displayBalance ?? balance ?? 0).toLocaleString("cs-CZ");
  const currencySymbol = currency === "CZK" ? "Kč" : currency === "EUR" ? "€" : currency;

  return (
    <Link
      href="/wallet"
      title="Zobrazit přehled provizí a peněženku"
      className={`relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        isBumping
          ? "border-emerald-500/60 bg-emerald-950/40 ring-1 ring-emerald-500/40 shadow-sm"
          : "border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-800/60"
      }`}
    >
      <TrendingUp
        className={`h-3.5 w-3.5 shrink-0 transition-colors duration-300 ${
          isBumping ? "text-emerald-400" : "text-zinc-400"
        }`}
        aria-hidden="true"
      />

      <div className="min-w-0">
        <span
          className={`hidden sm:block text-[9px] font-semibold uppercase tracking-wider leading-none transition-colors duration-300 ${
            isBumping ? "text-emerald-400/80" : "text-zinc-400"
          }`}
        >
          Provize
        </span>
        <span
          className={`text-xs font-bold font-mono tabular-nums leading-tight transition-colors duration-300 ${
            isBumping ? "text-emerald-300" : "text-zinc-100"
          }`}
        >
          {displayBalance === null ? "—" : `${formattedAmount} ${currencySymbol}`}
        </span>
      </div>
    </Link>
  );
}
