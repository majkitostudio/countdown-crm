import Link from "next/link";
import { LockKeyhole, Phone } from "lucide-react";
import { DataAccessError } from "@/lib/dal/errors";
import { getWorkspaceTelephonySettings } from "@/lib/dal/telephonySettings";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { TelephonyAdminPanel } from "@/components/telephony/TelephonyAdminPanel";
import { PageHeader } from "@/components/layout/PageHeader";

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
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Telephony administration unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{forbidden ? "Only a workspace Administrator can access Local SIP administration." : "Telephony status could not be loaded."}</p>
      </div>
    );
  }

  if (result.settings.active_adapter !== "local_sip") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Local SIP is not active.</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Enable Local SIP in Admin Settings to use this page.</p>
        <Link href="/settings#telephony-adapter" className="mt-5 inline-flex rounded-xl border border-zinc-800 px-4 py-2.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100">
          Open Telephony adapter settings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-8">
      <PageHeader icon={Phone} title="Local SIP" badge={{ label: "Administrator only", tone: "neutral" }} backLink={{ href: "/settings#telephony-adapter", label: "Back to Settings" }} description="Local Asterisk console for internal CRM telephony testing." />
      <TelephonyAdminPanel settings={result.settings} />
    </div>
  );
}
