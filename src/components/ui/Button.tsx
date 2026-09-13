import type { ComponentPropsWithoutRef } from "react";
import { getSafeLayoutClassName } from "@/components/ui/Surface";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

const BUTTON_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary: "bg-action-primary text-text-inverse hover:bg-action-primary-hover",
  secondary: "border border-border-default bg-action-secondary text-text-secondary hover:border-border-strong hover:bg-action-secondary-hover",
  quiet: "text-text-muted hover:bg-action-secondary-hover hover:text-text-secondary",
  danger: "border border-status-danger-border bg-action-danger text-status-danger-text hover:bg-action-danger-hover",
};

const BUTTON_BASE_CLASS_NAME = "inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50";

export function getButtonClassName(variant: ButtonVariant): string {
  return `${BUTTON_BASE_CLASS_NAME} ${BUTTON_CLASS_NAMES[variant]}`;
}

export type ButtonProps = Omit<ComponentPropsWithoutRef<"button">, "className" | "style"> & {
  variant?: ButtonVariant;
  className?: string;
  style?: never;
};

export function Button({ variant = "primary", className, style: _style, type = "button", ...props }: ButtonProps) {
  void _style;
  return <button type={type} className={[getButtonClassName(variant), getSafeLayoutClassName(className)].filter(Boolean).join(" ")} {...props} />;
}
