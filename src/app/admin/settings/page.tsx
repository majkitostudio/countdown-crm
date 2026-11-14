import { LockKeyhole, WalletCards } from "lucide-react";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkspaceSettingsPanel } from "@/components/settings/WorkspaceSettingsPanel";
import { Surface } from "@/components/ui/Surface";

export default async function AdminWorkspaceSettingsPage() {
  const context = await requireWorkspaceContext();

  if (context.role !== "administrator") {
    return (
      <div className="mx-auto max-w-xl">
        <Surface variant="empty">
          <LockKeyhole className="mx-auto h-8 w-8 text-zinc-500" />
          <h1 className="mt-4 text-base font-semibold text-zinc-100">
            Nastavení pracovního prostoru je dostupné pouze pro administrátory
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            Osobní nastavení zůstává v Nastavení; nastavení celého pracovního prostoru patří do Správy.
          </p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={WalletCards}
        title="Nastavení pracovního prostoru"
        badge={{ label: "Pouze pro administrátory", tone: "neutral" }}
        backLink={{ href: "/admin", label: "Zpět do správy" }}
        description="Pravidla a provize peněženky pro celý pracovní prostor."
      />
      <WorkspaceSettingsPanel />
    </div>
  );
}
