import type { ComponentPropsWithoutRef } from "react";
import { getSafeLayoutClassName } from "@/components/ui/Surface";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const BUTTON_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary: "bg-zinc-100 text-zinc-950 hover:bg-white",
  secondary: "border border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800",
  quiet: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
  danger: "border border-rose-800/50 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40",
};

const BUTTON_BASE_CLASS_NAME = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50";

export function getButtonClassName(variant: ButtonVariant): string {
  return `${BUTTON_BASE_CLASS_NAME} ${BUTTON_CLASS_NAMES[variant]}`;
}

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={[getButtonClassName(variant), getSafeLayoutClassName(className)].filter(Boolean).join(" ")} {...props} />;
}
