"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Volume2,
  Sparkles,
  Save,
  CheckCircle2,
  Bell,
  Cpu,
  Mic,
  Shield,
  Play
} from "lucide-react";
import { getUserSettings, saveUserSettings, UserSettings } from "@/lib/settings";
import { sounds } from "@/lib/audio";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  useEffect(() => {
    setSettings(getUserSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserSettings(settings);
    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 4000);
  };

  const handleTestAudio = () => {
    setIsPlayingTestSound(true);
    const stopAudio = sounds.playRingtone();
    setTimeout(() => {
      stopAudio();
      setIsPlayingTestSound(false);
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-amber-400" />
          Operator Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure speech recognition languages, Google Gemini AI copilot automation, and call audio effects
        </p>
      </div>

      {/* Success Notification Alert */}
      {isSavedAlert && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in duration-200 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Preferences Saved Successfully!</p>
            <p className="text-[11px] text-emerald-200/80">Your operator profile and AI copilot settings have been persisted.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: Operator Profile */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Operator Profile Information</h2>
              <p className="text-[11px] text-zinc-400">Manage identity displayed in call logs and sales receipts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block">Full Name</label>
              <input
                type="text"
                value={settings.operator_name}
                onChange={(e) => setSettings({ ...settings, operator_name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-zinc-400 font-semibold block">Assigned Role</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={settings.role}
                  className="flex-1 bg-zinc-950/60 border border-zinc-800 text-zinc-500 rounded-xl px-3.5 py-2 cursor-not-allowed"
                />
                <span className="px-3 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/20 flex items-center gap-1.5 shrink-0">
                  <Shield className="w-3.5 h-3.5" /> Active Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Speech Recognition & Google Gemini AI Copilot */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-100">Speech Recognition & Google Gemini Copilot</h2>
                <p className="text-[11px] text-zinc-400">Configure WebSpeech API language and automated transcript analysis</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-full border border-cyan-500/20 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Gemini 2.5 Flash
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" /> Default Recognition Language
              </label>
              <select
                value={settings.default_language}
                onChange={(e) =>
                  setSettings({ ...settings, default_language: e.target.value as UserSettings["default_language"] })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700 cursor-pointer"
              >
                <option value="cs-CZ">Czech (cs-CZ)</option>
                <option value="sk-SK">Slovak (sk-SK)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" /> Auto AI Objection Analysis
              </label>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2">
                <span className="text-zinc-300">Trigger Gemini Flash on speech</span>
                <input
                  type="checkbox"
                  checked={settings.gemini_auto_analyze}
                  onChange={(e) => setSettings({ ...settings, gemini_auto_analyze: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Audio Effects & Ringtone Controls */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Virtual Call Audio Effects</h2>
              <p className="text-[11px] text-zinc-400">Web Audio API dual-tone ringtones and call status audio feedback</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block flex items-center justify-between">
                <span>Ringtone Volume ({settings.ringtone_volume}%)</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.ringtone_volume}
                onChange={(e) => setSettings({ ...settings, ringtone_volume: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block">Audio Feedback Test</label>
              <button
                type="button"
                onClick={handleTestAudio}
                disabled={isPlayingTestSound}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 text-emerald-400 ${isPlayingTestSound ? "animate-spin" : ""}`} />
                <span>{isPlayingTestSound ? "Playing Ringtone..." : "Test Ringtone Sound"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Changes CTA Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-2xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>

      </form>

    </div>
  );
}
