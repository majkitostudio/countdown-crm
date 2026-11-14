import Link from "next/link";
import { LockKeyhole, Phone } from "lucide-react";
import { DataAccessError } from "@/lib/dal/errors";
import { getWorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { TelephonyAdminPanel } from "@/components/telephony/TelephonyAdminPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { getButtonClassName } from "@/components/ui/Button";

type TelephonyPageLoadResult =
  | { settings: Awaited<ReturnType<typeof getWorkspaceTelephonySettings>> }
  | { error: unknown };

async function loadTelephonyPage(): Promise<TelephonyPageLoadResult> {
  try {
    await requireWorkspaceRole(["administrator"]);
    return { settings: await getWorkspaceTelephonySettings() };
  } catch (error) {
    return { error };
  }
}

export default async function TelephonyPage() {
  const result = await loadTelephonyPage();

  if ("error" in result) {
    const forbidden = result.error instanceof DataAccessError && result.error.code === "FORBIDDEN";
    return (
      <div className="mx-auto max-w-xl">
      <Surface variant="empty">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Správa telefonie není dostupná</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{forbidden ? "K správě místního SIP má přístup pouze správce pracovního prostoru." : "Stav telefonie se nepodařilo načíst."}</p>
      </Surface>
      </div>
    );
  }

  if (result.settings.active_adapter !== "local_sip") {
    return (
      <div className="mx-auto max-w-xl">
      <Surface variant="empty">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h1 className="text-base font-semibold text-zinc-100">Místní SIP není aktivní.</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Pro použití této stránky povolte místní SIP v nastavení správce.</p>
        <Link
          href="/admin/settings#telephony-adapter"
          className={getButtonClassName("secondary")}
        >
          Otevřít nastavení adaptéru telefonie
        </Link>
      </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader icon={Phone} title="Místní SIP" badge={{ label: "Pouze pro správce", tone: "neutral" }} backLink={{ href: "/admin/settings#telephony-adapter", label: "Zpět do nastavení pracovního prostoru" }} description="Místní konzole Asterisk pro interní testování telefonie v CRM." />
      <TelephonyAdminPanel settings={result.settings} />
    </div>
  );
}
