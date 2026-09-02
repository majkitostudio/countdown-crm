"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  User,
  Volume2,
  Save,
  Play,
  Database,
  FileText,
  Plus,
} from "lucide-react";
import { DEFAULT_USER_SETTINGS, getUserSettings, saveUserSettings, UserSettings } from "@/lib/settings";
import { sounds } from "@/lib/audio";
import { deleteSchemaAction, listSchemasAction } from "@/app/actions/schema";
import { ObjectSchema } from "@/lib/schema/types";
import { ObjectBuilderModal } from "@/components/schema/ObjectBuilderModal";
import { useOperatorIdentity } from "@/components/layout/OperatorIdentityProvider";
import { getOperatorRoleLabel } from "@/lib/operatorIdentity";
import { isAdministrator, isTeamLeaderOrAdministrator } from "@/lib/auth/roles";
import { PageHeader } from "@/components/layout/PageHeader";
import { getWalletOverviewAction } from "@/app/actions/wallet";
import { WalletManagerPanel } from "@/components/wallet/WalletManagerPanel";
import type { WalletOverviewDTO } from "@/lib/dal/wallet";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [isObjectBuilderOpen, setIsObjectBuilderOpen] = useState(false);
  const [schemas, setSchemas] = useState<ObjectSchema[]>([]);
  const [isSchemasLoading, setIsSchemasLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaActionError, setSchemaActionError] = useState<string | null>(null);
  const [walletOverview, setWalletOverview] = useState<WalletOverviewDTO | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const { identity, isLoading: isOperatorLoading } = useOperatorIdentity();
  const canManageWorkspaceSchema = isTeamLeaderOrAdministrator(identity?.role);
  const canManageProductScripts = isAdministrator(identity?.role);

  useEffect(() => {
    const loadSettingsTimer = window.setTimeout(() => {
      setSettings(getUserSettings());
    }, 0);

    return () => window.clearTimeout(loadSettingsTimer);
  }, []);

  useEffect(() => {
    if (!canManageWorkspaceSchema) {
      return;
    }

    let isCurrent = true;
    void getWalletOverviewAction()
      .then((overview) => {
        if (isCurrent) setWalletOverview(overview);
      })
      .catch((error) => {
        if (isCurrent) setWalletError(error instanceof Error ? error.message : "Wallet settings could not be loaded.");
      });

    return () => {
      isCurrent = false;
    };
  }, [canManageWorkspaceSchema]);

  const loadSchemas = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsSchemasLoading(true);
      setSchemaError(null);
    }
    try {
      setSchemas(await listSchemasAction());
    } catch (error) {
      setSchemaError(error instanceof Error ? error.message : "Schémata se nepodařilo načíst.");
    } finally {
      setIsSchemasLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void listSchemasAction()
      .then((nextSchemas) => {
        if (isCurrent) setSchemas(nextSchemas);
      })
      .catch((error) => {
        if (isCurrent) {
          setSchemaError(error instanceof Error ? error.message : "Schémata se nepodařilo načíst.");
        }
      })
      .finally(() => {
        if (isCurrent) setIsSchemasLoading(false);
      });

    return () => {
      isCurrent = false;
    };
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

  const handleDeleteSchema = async (slug: string, name: string) => {
    if (!window.confirm(`Opravdu odstranit custom object „${name}“?`)) return;

    setSchemaActionError(null);
    try {
      await deleteSchemaAction(slug);
      await loadSchemas(true);
    } catch (error) {
      setSchemaActionError(error instanceof Error ? error.message : "Schema se nepodařilo odstranit.");
    }
  };

  return (
    <div className="space-y-8 max-w-screen-2xl mx-auto">
      <PageHeader
        icon={SettingsIcon}
        title="Operator Settings & Schema Engine"
        badge={{ label: "Config Active", tone: "neutral" }}
        description="Configure operator audio feedback and workspace custom objects"
        actions={
          <>
          {canManageProductScripts && (
            <Link
              href="/settings/scripts"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:border-zinc-500 hover:text-zinc-100"
            >
              <FileText className="h-4 w-4" />
              <span>Product Scripts</span>
            </Link>
          )}
          {canManageWorkspaceSchema && (
            <button
              type="button"
              onClick={() => setIsObjectBuilderOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow-sm transition-all hover:bg-zinc-200"
            >
              <Plus className="w-4 h-4" />
              <span>Vytvořit Custom Object</span>
            </button>
          )}
          </>
        }
      />

      {/* Success Notification Alert */}
      {isSavedAlert && (
        <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-4 rounded-xl text-xs flex items-center gap-3 font-mono animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-100">Preferences saved successfully!</p>
            <p className="text-[11px] text-zinc-400">Your operator preferences have been saved locally.</p>
          </div>
        </div>
      )}

      {canManageWorkspaceSchema && (
        <section data-testid="wallet-settings-boundary" className="space-y-4">
          {walletOverview === null && !walletError ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-xs text-zinc-400">Loading workspace wallet settings...</div>
          ) : walletError ? (
            <div role="alert" className="rounded-2xl border border-rose-900/60 bg-rose-950/20 p-5 text-xs text-rose-300">Wallet settings unavailable: {walletError}</div>
          ) : walletOverview?.settings ? (
            <WalletManagerPanel mode="settings" settings={walletOverview.settings} rules={walletOverview.rules} members={[]} />
          ) : null}
        </section>
      )}

      {/* Section: Custom Schema & Objects (Attio Engine) */}
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

          {canManageWorkspaceSchema && (
            <button
              type="button"
              onClick={() => setIsObjectBuilderOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-lg border border-zinc-800 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nové Schema</span>
            </button>
          )}
        </div>

        {/* Registered Objects Grid */}
        {schemaError ? (
          <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs text-rose-300" role="alert">
            Schémata se nepodařilo načíst: {schemaError}
          </div>
        ) : isSchemasLoading ? (
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 text-xs text-zinc-500">
            Načítám schémata z workspace...
          </div>
        ) : (
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
                  {!["leads", "products", "deals"].includes(s.slug) && canManageWorkspaceSchema ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteSchema(s.slug, s.name)}
                      className="text-rose-400 hover:text-rose-300 font-mono cursor-pointer"
                    >
                      Odstranit
                    </button>
                  ) : (
                    <span className="text-zinc-400 font-mono">Built-in schema</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {schemaActionError && (
          <div className="p-3 rounded-xl border border-rose-900/60 bg-rose-950/20 text-xs text-rose-300" role="alert">
            {schemaActionError}
          </div>
        )}
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
                <span className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Effects & Ringtone Controls */}
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
        onSchemaCreated={async () => {
          await loadSchemas(true);
        }}
      />
    </div>
  );
}
