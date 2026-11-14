"use client";

import { useEffect, useState } from "react";
import { getWalletOverviewAction } from "@/app/actions/wallet";
import { WalletManagerPanel } from "@/components/wallet/WalletManagerPanel";
import type { WalletOverviewDTO } from "@/lib/dal/wallet";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

/**
 * Workspace-wide settings that used to sit inside the personal Settings page.
 * They now live behind the Management hub as a single administrator surface.
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
          setWalletError(error instanceof Error ? error.message : "Nastavení peněženky se nepodařilo načíst.");
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
          <Surface variant="inset"><div className="p-5 text-xs text-zinc-400">Načítání nastavení peněženky pracovního prostoru...</div></Surface>
        ) : walletError ? (
          <StatusAlert tone="danger">Nastavení peněženky není dostupné: {walletError}</StatusAlert>
        ) : walletOverview && !walletSettingsAvailable ? (
          <StatusAlert tone="danger">
            Nastavení peněženky není dostupné: {walletOverview.sections.settings.state === "unavailable" ? walletOverview.sections.settings.message : "Nastavení peněženky není dostupné."}
          </StatusAlert>
        ) : walletOverview?.settings ? (
          <>
            {!walletRulesAvailable && (
              <StatusAlert tone="warning">
                Bonusová pravidla peněženky nejsou dostupná: {walletOverview.sections.rules.state === "unavailable" ? walletOverview.sections.rules.message : "Bonusová pravidla peněženky nejsou dostupná."}
              </StatusAlert>
            )}
            <WalletManagerPanel mode="settings" settings={walletOverview.settings} rules={walletOverview.rules} members={[]} rulesAvailable={walletRulesAvailable} />
          </>
        ) : null}
      </section>
    </div>
  );
}
