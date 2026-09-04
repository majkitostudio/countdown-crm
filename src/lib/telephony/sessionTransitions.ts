import {
  getAllowedPreviousStatuses as getLifecycleAllowedPreviousStatuses,
  isTelephonyCallStatus,
  type TelephonyCallStatus,
} from "./telnyxLifecycle";

export function getAllowedPreviousStatuses(next: TelephonyCallStatus): readonly TelephonyCallStatus[] {
  return getLifecycleAllowedPreviousStatuses(next);
}

export function isSessionStatus(value: unknown): value is TelephonyCallStatus {
  return isTelephonyCallStatus(value);
}
