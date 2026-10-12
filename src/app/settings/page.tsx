"use client";

import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Volume2,
  Save,
  Play,
} from "lucide-react";
import { sounds } from "@/lib/audio";
import { useOperatorIdentity } from "@/components/layout/OperatorIdentityProvider";
import { getOperatorRoleLabel } from "@/lib/operatorIdentity";
import { PageHeader } from "@/components/layout/PageHeader";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/Button";
import { StatusAlert, StatusBadge } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

export default function SettingsPage() {
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const {
    preferences: settings,
    setPreferences: setSettings,
    isLoading: isPreferencesLoading,
    error: preferencesError,
    save: savePreferences,
  } = useUserPreferences();
  const { identity, isLoading: isOperatorLoading } = useOperatorIdentity();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    try {
      await savePreferences(settings);
      setIsSavedAlert(true);
      window.setTimeout(() => setIsSavedAlert(false), 4000);
    } catch {
      setIsSavedAlert(false);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleTestAudio = () => {
    setIsPlayingTestSound(true);
    const stopAudio = sounds.playRingtone(settings.ringtone_volume);
    setTimeout(() => {
      stopAudio();
      setIsPlayingTestSound(false);
    }, 2500);
  };

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        badge={{ label: "Personal", tone: "neutral" }}
        description="Osobní nastavení operátora."
      />

      {/* Success Notification Alert */}
      {isSavedAlert && (
        <StatusAlert tone="success">
          <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-100">Preferences saved successfully!</p>
            <p className="text-[11px] text-zinc-400">Your preferences are saved to your account.</p>
          </div>
          </div>
        </StatusAlert>
      )}

      {preferencesError && (
        <StatusAlert tone="danger">
          Preferences unavailable: {preferencesError}
        </StatusAlert>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Operator Profile */}
        <Surface variant="page">
          <div className="space-y-6 p-7">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/80">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Operator Profile Information</h2>
              <p className="text-[11px] text-zinc-400">Identity is sourced from the authenticated operator profile across CRM activity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block">Full Name</label>
              <input
                type="text"
                value={identity?.name || (isOperatorLoading ? "Loading operator..." : "Unknown operator")}
                readOnly
                disabled
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-400 font-medium block">Email Address</label>
              <input
                type="email"
                value={identity?.email || (isOperatorLoading ? "Loading operator..." : "Unavailable")}
                readOnly
                disabled
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-zinc-400 font-medium block">Assigned Role</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  value={getOperatorRoleLabel(identity?.role || null)}
                  className="flex-1 bg-zinc-950/60 border border-zinc-800 text-zinc-500 rounded-lg px-3.5 py-2 cursor-not-allowed font-mono"
                />
                <StatusBadge tone="success">
                  Active Member
                </StatusBadge>
              </div>
            </div>
          </div>
          </div>
        </Surface>

        {/* Audio Effects & Ringtone Controls */}
        <Surface variant="page">
          <div className="space-y-4 p-5">
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
              <Button
                variant="secondary"
                type="button"
                onClick={handleTestAudio}
                disabled={isPlayingTestSound}
                className="w-full"
              >
                <Play className={`w-3.5 h-3.5 text-zinc-400 ${isPlayingTestSound ? "animate-spin" : ""}`} />
                <span>{isPlayingTestSound ? "Playing Ringtone..." : "Test Ringtone Sound"}</span>
              </Button>
            </div>
          </div>
          </div>
        </Surface>

        {/* Save Changes CTA Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isPreferencesLoading || isSavingPreferences}
          >
            <Save className="w-4 h-4" />
            <span>{isSavingPreferences ? "Saving..." : isPreferencesLoading ? "Loading..." : "Save Preferences"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
