import Link from "next/link";
import {
  FileText,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
import { getWorkspaceReadinessForWorkspace } from "@/lib/dal/workspaceReadiness";
import type { WorkspaceReadinessCheck } from "@/lib/dal/workspaceReadiness";
import { WorkspaceHealthStrip } from "@/components/admin/WorkspaceHealthStrip";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";

interface AdminHubCard {
  href: string;
  label: string;
  description: string;
  legacyPath: string;
  icon: typeof ShieldCheck;
}

/**
 * The single entry point for workspace administration. Each card still opens
 * the dedicated, already server-guarded surface, so no capability moves; only
 * the way administrators reach it changes.
 */
const ADMIN_HUB_CARDS: readonly AdminHubCard[] = [
  {
    href: "/settings/users",
    label: "Users & Teams",
    description: "Členové, role ve workspace a odpovědnosti za týmy.",
    legacyPath: "/settings/users",
    icon: Users,
  },
  {
    href: "/products?tab=scripts",
    label: "Products & Scripts",
    description: "Katalog produktů a schválené skripty, které čtou operátoři.",
    legacyPath: "/settings/scripts",
    icon: FileText,
  },
  {
    href: "/workflows",
    label: "Automations",
    description: "Automatická pravidla a webhooky spouštěné událostmi.",
    legacyPath: "/workflows",
    icon: Workflow,
  },
  {
    href: "/admin/settings",
    label: "Workspace Settings",
    description: "Pravidla a provize walletu pro celý workspace.",
    legacyPath: "/settings",
    icon: WalletCards,
  },
];

export default async function AdminHubPage() {
  const context = await requireWorkspaceContext();

  let healthChecks: WorkspaceReadinessCheck[] | null = null;
  try {
    const readiness = await getWorkspaceReadinessForWorkspace();
    healthChecks = readiness.checks;
  } catch {
    healthChecks = null;
  }

  if (context.role !== "administrator") {
    return (
      <div className="mx-auto max-w-xl">
        <Surface variant="empty">
          <LockKeyhole className="mx-auto h-8 w-8 text-zinc-500" />
          <h1 className="mt-4 text-base font-semibold text-zinc-100">
            Management is available to administrators only
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            Správa workspace nepatří k práci operátora ani Team Leadera.
          </p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={ShieldCheck}
        title="Management"
        description="Jedno místo pro správu workspace: členové, produkty a skripty, automatizace a nastavení."
        badge={{ label: "Administrator only", tone: "neutral" }}
      />

      {healthChecks ? (
        <WorkspaceHealthStrip checks={healthChecks} />
      ) : (
        <Surface variant="empty" className="w-full">
          <p className="text-sm font-semibold text-zinc-100">Workspace health is unavailable</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Provozní kontroly se nepodařilo načíst — zkuste to prosím později.
          </p>
        </Surface>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ADMIN_HUB_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900/60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-zinc-100">{card.label}</span>
              <span className="text-xs leading-relaxed text-zinc-400">{card.description}</span>
              <span className="mt-auto font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                was {card.legacyPath}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
