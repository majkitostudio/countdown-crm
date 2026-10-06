"use client";

import React, { useState } from "react";
import { Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export default function AudioPreviewPage() {
  const [currentCommission, setCurrentCommission] = useState(1450);
  const [bumpType, setBumpType] = useState<"positive" | "negative" | null>(null);
  const [selectedNegVariant, setSelectedNegVariant] = useState<"1" | "2" | "3">("1");

  // Syntetizátory Web Audio API
  const getAudioContext = () => {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  };

  // 1. POZITIVNÍ ZVUK: Wall Street Terminal (Vítěz)
  const playWallStreetPositive = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. tón: G4 (392 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(392.00, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // 2. tón: C5 (523.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(523.25, now + 0.08);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.26, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.6);
  };

  // 2. NEGATIVNÍ ZVUKY (PROTIKLADY)
  const playNegativeSound = (variant: "1" | "2" | "3") => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (variant === "1") {
      // Protiklad 1: Wall Street Dip (Inverze C5 523 Hz -> G4 392 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(392.00, now + 0.08);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.24, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.55);
    } else if (variant === "2") {
      // Protiklad 2: Tlumený basový úder (160 Hz -> 100 Hz low-pass)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350, now);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(164.81, now);
      osc.frequency.exponentialRampToValueAtTime(98.00, now + 0.28);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (variant === "3") {
      // Protiklad 3: Diskrétní taktické varování (349 Hz -> 311 Hz)
      [349.23, 311.13].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.18, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.2);
      });
    }
  };

  const handleSelectNegVariant = (variant: "1" | "2" | "3") => {
    setSelectedNegVariant(variant);
    playNegativeSound(variant);
  };

  const animRef = React.useRef<number | null>(null);

  const handleTriggerSale = () => {
    playWallStreetPositive();
    setBumpType("positive");
    setTimeout(() => setBumpType(null), 1800);

    const startVal = currentCommission;
    const targetVal = currentCommission + 150;
    const startTime = performance.now();
    const duration = 750;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * easeOut);
      setCurrentCommission(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setCurrentCommission(targetVal);
      }
    };

    animRef.current = requestAnimationFrame(step);
  };

  const handleTriggerPenalty = () => {
    playNegativeSound(selectedNegVariant);
    setCurrentCommission((prev) => Math.max(0, prev - 100));
    setBumpType("negative");
    setTimeout(() => setBumpType(null), 1800);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        
        <PageHeader
          icon={Briefcase}
          title="Zvuková rovnováha: Prodej (+150 Kč) vs. Pokuta (-100 Kč)"
          description="Pozitivní dopamin versus střízlivé, netrestající upozornění na korekci/storno provize."
          backLink={{
            href: "/workspace",
            label: "Zpět do operátorské konzole",
          }}
        />

        <Surface variant="page" className="p-6 space-y-6">

          {/* Simulace widgetu v záhlaví */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Ukázka displaye v záhlaví (AppHeader):
            </span>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Operátor: Jan Novák</span>
              </div>

              {/* Commission Badge Widget */}
              <div
                className={`relative flex items-center gap-2 rounded-xl border px-3.5 py-1.5 transition-all duration-300 ${
                  bumpType === "positive"
                    ? "border-emerald-500/60 bg-emerald-950/40 ring-1 ring-emerald-500/40 shadow-sm"
                    : bumpType === "negative"
                    ? "border-rose-500/60 bg-rose-950/40 ring-1 ring-rose-500/40 shadow-sm"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <TrendingUp
                  className={`h-3.5 w-3.5 shrink-0 transition-colors duration-300 ${
                    bumpType === "positive"
                      ? "text-emerald-400"
                      : bumpType === "negative"
                      ? "text-rose-400"
                      : "text-zinc-400"
                  }`}
                  aria-hidden="true"
                />
                <div>
                  <span
                    className={`block text-[9px] uppercase font-semibold tracking-wider leading-none transition-colors duration-300 ${
                      bumpType === "positive"
                        ? "text-emerald-400/80"
                        : bumpType === "negative"
                        ? "text-rose-400/80"
                        : "text-zinc-400"
                    }`}
                  >
                    Provize
                  </span>
                  <span
                    className={`text-xs font-bold font-mono tabular-nums leading-tight transition-colors duration-300 ${
                      bumpType === "positive"
                        ? "text-emerald-300"
                        : bumpType === "negative"
                        ? "text-rose-300"
                        : "text-zinc-100"
                    }`}
                  >
                    {currentCommission.toLocaleString("cs-CZ")} Kč
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Výběr protikladu (záporné varianty) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Zvolte protiklad pro mínusový bonus / storno:
              </span>
              <span className="text-[11px] text-zinc-500">Bez cirkusových bzučáků</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSelectNegVariant("1")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedNegVariant === "1"
                    ? "border-rose-500/60 bg-zinc-900 ring-1 ring-rose-500/30 shadow-md"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">1. Wall Street Dip</span>
                  <span className="text-[10px] text-rose-400 font-mono">Doporučeno</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-snug">
                  Sestupný burzovní dvoutón (C5 ➔ G4). Přesný zrcadlový opak prodeje (pokles trhu).
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectNegVariant("2")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedNegVariant === "2"
                    ? "border-rose-500/60 bg-zinc-900 ring-1 ring-rose-500/30 shadow-md"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">2. Tlumený bas</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Sub-bass</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-snug">
                  Suchý, hluboký basový úder (160 Hz ➔ 100 Hz). Fyzický pocit ztráty bez agrese.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectNegVariant("3")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedNegVariant === "3"
                    ? "border-rose-500/60 bg-zinc-900 ring-1 ring-rose-500/30 shadow-md"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">3. Taktický alert</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Diskrétní</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-snug">
                  Dva tlumené středové pulzy (349 Hz ➔ 311 Hz). Neutrální systémové upozornění.
                </p>
              </button>
            </div>
          </div>

          {/* Testovací akce: Prodej vs Pokuta */}
          <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              Aktivní protiklad: <strong className="text-zinc-200">
                {selectedNegVariant === "1" && "1. Wall Street Dip"}
                {selectedNegVariant === "2" && "2. Tlumený bas"}
                {selectedNegVariant === "3" && "3. Taktický alert"}
              </strong>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={handleTriggerSale}>
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Prodej (+150 Kč)
              </Button>

              <Button variant="danger" onClick={handleTriggerPenalty}>
                <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Pokuta / Storno (-100 Kč)
              </Button>
            </div>
          </div>

        </Surface>
      </div>
    </div>
  );
}
