/**
 * Demo Mode & Production Environment Isolation Guard
 */

const DEMO_MODE_STORAGE_KEY = "countdown_demo_mode_active";

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem(DEMO_MODE_STORAGE_KEY);
  if (saved === null) return false;
  return saved === "true";
}

export function setDemoMode(active: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, String(active));
    window.dispatchEvent(new CustomEvent("countdown-demo-mode-changed", { detail: { active } }));
  }
}

export function subscribeDemoMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("countdown-demo-mode-changed", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("countdown-demo-mode-changed", onStoreChange);
  };
}

export function getDemoModeSnapshot(): boolean {
  return isDemoModeActive();
}

export function getDemoModeServerSnapshot(): boolean {
  return false;
}
