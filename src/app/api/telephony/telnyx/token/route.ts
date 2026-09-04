import { NextResponse } from "next/server";
import { requireWorkspaceRole } from "@/lib/dal/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTelnyxCredential, issueTelnyxToken, TelnyxConfigurationError, getTelnyxConfig } from "@/lib/telephony/telnyxServer";

export const runtime = "nodejs";

export async function POST() {
  try {
    const context = await requireWorkspaceRole(["operator", "team_leader", "administrator"]);
    const config = getTelnyxConfig();
    const supabase = createAdminClient();

    let { data: credential } = await supabase
      .from("telephony_credentials")
      .select("provider_credential_id")
      .eq("workspace_id", context.workspaceId)
      .eq("operator_id", context.userId)
      .eq("provider", "telnyx")
      .maybeSingle();

    if (!credential?.provider_credential_id) {
      const providerCredentialId = await createTelnyxCredential({
        name: `countdown-${context.userId}`,
        workspaceId: context.workspaceId,
      });
      const { data: inserted, error } = await supabase
        .from("telephony_credentials")
        .upsert({
          workspace_id: context.workspaceId,
          operator_id: context.userId,
          provider: "telnyx",
          provider_credential_id: providerCredentialId,
        }, { onConflict: "workspace_id,operator_id,provider" })
        .select("provider_credential_id")
        .single();

      if (error || !inserted) throw new Error("Could not store the Telnyx operator credential.");
      credential = inserted;
    }

    const token = await issueTelnyxToken(credential.provider_credential_id);
    return NextResponse.json({ token, callerNumber: config.callerNumber });
  } catch (error) {
    const message = error instanceof TelnyxConfigurationError
      ? error.message
      : error instanceof Error ? error.message : "Telnyx token could not be issued.";
    const status = error instanceof TelnyxConfigurationError ? 503 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
