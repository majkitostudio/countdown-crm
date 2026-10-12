import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Users,
  WalletCards,
  Workflow,
  Zap,
} from "lucide-react";
import { requireWorkspaceContext } from "@/lib/dal/workspace";
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
    href: "/controls",
    label: "Readiness",
    description: "Operational readiness checklist for the active workspace.",
    legacyPath: "/controls",
    icon: ClipboardCheck,
  },
  {
    href: "/settings/users",
    label: "Users & Teams",
    description: "Members, workspace roles and team ownership.",
    legacyPath: "/settings/users",
    icon: Users,
  },
  {
    href: "/settings/scripts",
    label: "Products & Scripts",
    description: "Product catalog and the approved scripts operators read.",
    legacyPath: "/settings/scripts",
    icon: FileText,
  },
  {
    href: "/workflows",
    label: "Workflows & Automations",
    description: "Event rules and automated sequences.",
    legacyPath: "/workflows",
    icon: Workflow,
  },
  {
    href: "/admin/settings",
    label: "Workspace Settings",
    description: "Wallet rules, commissions and the telephony adapter.",
    legacyPath: "/settings",
    icon: WalletCards,
  },
  {
    href: "/telephony",
    label: "Telephony",
    description: "Local SIP console for internal telephony testing.",
    legacyPath: "/telephony",
    icon: Zap,
  },
];

export default async function AdminHubPage() {
  const context = await requireWorkspaceContext();

  if (context.role !== "administrator") {
    return (
      <div className="mx-auto max-w-xl">
        <Surface variant="empty">
          <LockKeyhole className="mx-auto h-8 w-8 text-zinc-500" />
          <h1 className="mt-4 text-base font-semibold text-zinc-100">
            Admin Hub is available to administrators only
          </h1>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
            Workspace administration is not part of operator or Team Leader work.
          </p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader
        icon={ShieldCheck}
        title="Admin Hub"
        description="One place for workspace administration: readiness, members, products and scripts, automations, settings and telephony."
        badge={{ label: "Administrator only", tone: "neutral" }}
      />

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
