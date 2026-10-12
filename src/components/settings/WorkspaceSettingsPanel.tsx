"use client";

import { useEffect, useState } from "react";
import { getWalletOverviewAction } from "@/app/actions/wallet";
import { WalletManagerPanel } from "@/components/wallet/WalletManagerPanel";
import type { WalletOverviewDTO } from "@/lib/dal/wallet";
import { TelephonyAdapterSettings } from "@/components/settings/TelephonyAdapterSettings";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

/**
 * Workspace-wide settings that used to sit inside the personal Settings page.
 * They now live behind the Admin Hub as a single administrator surface.
 */
export function WorkspaceSettingsPanel() {
  const [walletOverview, setWalletOverview] = useState<WalletOverviewDTO | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const walletSettingsAvailable = walletOverview?.sections.settings.state === "available";
  const walletRulesAvailable = walletOverview?.sections.rules.state === "available";

  useEffect(() => {
    let isCurrent = true;

    void getWalletOverviewAction()
      .then((overview) => {
        if (isCurrent) setWalletOverview(overview);
      })
      .catch((error) => {
        if (isCurrent) {
          setWalletError(error instanceof Error ? error.message : "Wallet settings could not be loaded.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section data-testid="wallet-settings-boundary" className="space-y-4">
        {walletOverview === null && !walletError ? (
          <Surface variant="inset"><div className="p-5 text-xs text-zinc-400">Loading workspace wallet settings...</div></Surface>
        ) : walletError ? (
          <StatusAlert tone="danger">Wallet settings unavailable: {walletError}</StatusAlert>
        ) : walletOverview && !walletSettingsAvailable ? (
          <StatusAlert tone="danger">
            Wallet settings unavailable: {walletOverview.sections.settings.state === "unavailable" ? walletOverview.sections.settings.message : "Wallet settings are not available."}
          </StatusAlert>
        ) : walletOverview?.settings ? (
          <>
            {!walletRulesAvailable && (
              <StatusAlert tone="warning">
                Wallet bonus rules unavailable: {walletOverview.sections.rules.state === "unavailable" ? walletOverview.sections.rules.message : "Wallet bonus rules are not available."}
              </StatusAlert>
            )}
            <WalletManagerPanel mode="settings" settings={walletOverview.settings} rules={walletOverview.rules} members={[]} rulesAvailable={walletRulesAvailable} />
          </>
        ) : null}
      </section>

      <TelephonyAdapterSettings />
    </div>
  );
}
