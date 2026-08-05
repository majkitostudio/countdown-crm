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
  Play,
  Database,
  Plus,
  Layers,
} from "lucide-react";
import { getUserSettings, saveUserSettings, UserSettings } from "@/lib/settings";
import { sounds } from "@/lib/audio";
import { schemaEngine } from "@/lib/schema/engine";
import { ObjectSchema } from "@/lib/schema/types";
import { ObjectBuilderModal } from "@/components/schema/ObjectBuilderModal";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [isObjectBuilderOpen, setIsObjectBuilderOpen] = useState(false);
  const [schemas, setSchemas] = useState<ObjectSchema[]>(schemaEngine.getAllSchemas());

  useEffect(() => {
    setSettings(getUserSettings());
  }, []);

  const refreshSchemas = () => {
    setSchemas(schemaEngine.getAllSchemas());
  };

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
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      {/* Page Title Hero Banner */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2.5">
              <SettingsIcon className="w-5 h-5 text-zinc-400" />
              Operator Settings & Schema Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
              Config Active
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Configure speech recognition languages, Google Gemini AI copilot automation, custom EAV objects, and audio feedback
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsObjectBuilderOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Vytvořit Custom Object</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {isSavedAlert && (
        <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-4 rounded-xl text-xs flex items-center gap-3 font-mono animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-100">Preferences saved successfully!</p>
            <p className="text-[11px] text-zinc-400">Your operator profile and AI copilot settings have been persisted.</p>
          </div>
        </div>
      )}

      {/* Section: Custom Schema & Objects Manager (Attio Engine) */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-2xl p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Dynamic EAV Schema & Custom Objects</h2>
              <p className="text-[11px] text-zinc-400">Attio-grade object builder for Deals, Companies, Tickets and custom entities</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsObjectBuilderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span>Nové Schema</span>
          </button>
        </div>

        {/* Registered Objects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {schemas.map((s) => (
            <div key={s.id} className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span className="font-semibold text-xs text-zinc-100">{s.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded">
                  {s.slug}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2">{s.description}</p>
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                <span className="font-mono">{s.attributes.length} EAV atributů</span>
                <span className="text-zinc-400 font-mono">System Object</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Operator Profile */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 border-t border-white/5 backdrop-blur-md rounded-2xl p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Operator Profile Information</h2>
              <p className="text-[11px] text-zinc-400">Manage identity displayed in call logs and sales receipts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block">Full Name</label>
              <input
                type="text"
                value={settings.operator_name}
                onChange={(e) => setSettings({ ...settings, operator_name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-zinc-400 font-medium block">Assigned Role</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={settings.role}
                  className="flex-1 bg-zinc-950/60 border border-zinc-800 text-zinc-500 rounded-lg px-3.5 py-2 cursor-not-allowed font-mono"
                />
                <span className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Speech Recognition & Google Gemini AI Copilot */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Speech Recognition & Google Gemini Copilot</h2>
                <p className="text-[11px] text-zinc-400">Configure WebSpeech API language and automated transcript analysis</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-zinc-950 text-zinc-400 text-[10px] font-mono rounded-full border border-zinc-800 flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Gemini 2.5 Flash
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-zinc-400" /> Default Recognition Language
              </label>
              <select
                value={settings.default_language}
                onChange={(e) =>
                  setSettings({ ...settings, default_language: e.target.value as UserSettings["default_language"] })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700 cursor-pointer"
              >
                <option value="cs-CZ">Czech (cs-CZ)</option>
                <option value="sk-SK">Slovak (sk-SK)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" /> Auto AI Objection Analysis
              </label>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2">
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
        <div className="bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
            <div className="w-7 h-7 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Virtual Call Audio Effects</h2>
              <p className="text-[11px] text-zinc-400">Web Audio API dual-tone ringtones and call status audio feedback</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block flex items-center justify-between">
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
              <label className="text-zinc-400 font-medium block">Audio Feedback Test</label>
              <button
                type="button"
                onClick={handleTestAudio}
                disabled={isPlayingTestSound}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-zinc-800 transition-colors cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 text-zinc-400 ${isPlayingTestSound ? "animate-spin" : ""}`} />
                <span>{isPlayingTestSound ? "Playing Ringtone..." : "Test Ringtone Sound"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Changes CTA Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium rounded-lg text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Custom Object Builder Modal */}
      <ObjectBuilderModal
        isOpen={isObjectBuilderOpen}
        onClose={() => setIsObjectBuilderOpen(false)}
        onSchemaCreated={refreshSchemas}
      />
    </div>
  );
}
