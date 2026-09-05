"use server";

import {
  getActiveTelephonyAdapter,
  getWorkspaceTelephonySettings,
  updateWorkspaceTelephonyAdapter,
  type WorkspaceTelephonySettings,
} from "@/lib/dal/telephonySettings";
import type { SelectableTelephonyAdapter, TelephonyAdapter } from "@/lib/telephony/telephonyAdapterShared";

export async function getWorkspaceTelephonySettingsAction(): Promise<WorkspaceTelephonySettings> {
  return getWorkspaceTelephonySettings();
}

export async function updateWorkspaceTelephonyAdapterAction(
  adapter: SelectableTelephonyAdapter,
): Promise<WorkspaceTelephonySettings> {
  return updateWorkspaceTelephonyAdapter(adapter);
}

export async function getActiveTelephonyAdapterAction(): Promise<TelephonyAdapter> {
  return getActiveTelephonyAdapter();
}
