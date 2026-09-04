export type ClientProfileDensity = "full" | "compact";

export function getNextClientProfileDensity(
  current: ClientProfileDensity,
): ClientProfileDensity {
  return current === "full" ? "compact" : "full";
}

export function parseClientProfileDensity(value: string | null): ClientProfileDensity | null {
  return value === "full" || value === "compact" ? value : null;
}
