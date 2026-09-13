"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Surface } from "@/components/ui/Surface";

export type DialogSize = "sm" | "md" | "lg" | "xl";
export type DialogPlacement = "center" | "right";

const DIALOG_PANEL_CLASS_NAMES: Record<DialogSize, string> = {
  sm: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-sm",
  md: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-md",
  lg: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-2xl",
  xl: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-4xl",
};

const DIALOG_PLACEMENT_CLASS_NAMES: Record<DialogPlacement, string> = {
  center: "flex items-end md:items-center md:justify-center md:p-4",
  right: "flex justify-end",
};

const RIGHT_DIALOG_WIDTH_CLASS_NAMES: Record<DialogSize, string> = {
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-2xl",
  xl: "md:max-w-4xl",
};

export function getDialogPanelClassName(size: DialogSize, placement: DialogPlacement = "center"): string {
  if (placement === "center") return DIALOG_PANEL_CLASS_NAMES[size];

  return `${DIALOG_PANEL_CLASS_NAMES[size]} h-full max-h-screen rounded-none ${RIGHT_DIALOG_WIDTH_CLASS_NAMES[size]}`;
}

interface DialogProps {
  "aria-labelledby": string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  placement?: DialogPlacement;
  size?: DialogSize;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function Dialog({
  children,
  isOpen,
  onClose,
  placement = "center",
  size = "md",
  closeOnEscape = true,
  initialFocusRef,
  "aria-labelledby": ariaLabelledby,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeOnEscapeRef.current = closeOnEscape;
  }, [closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const firstFocusable = initialFocusRef?.current ?? getFocusableElements(dialogRef.current ?? document.body)[0];
      (firstFocusable ?? dialogRef.current)?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && closeOnEscapeRef.current) {
          event.preventDefault();
          onCloseRef.current();
          return;
        }

        if (event.key !== "Tab" || !dialogRef.current) return;

        const focusableElements = getFocusableElements(dialogRef.current);
        if (focusableElements.length === 0) {
          event.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }

    const previousFocus = previousFocusRef.current;
    previousFocusRef.current = null;
    if (!previousFocus) return;
    if (document.contains(previousFocus)) previousFocus.focus();
  }, [initialFocusRef, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black/70 p-0 backdrop-blur-xs ${DIALOG_PLACEMENT_CLASS_NAMES[placement]}`}>
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className={getDialogPanelClassName(size, placement)}>
        <Surface
          ref={dialogRef}
          variant="overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledby}
          tabIndex={-1}
          className={placement === "right" ? "w-full h-full" : "w-full"}
        >
          {children}
        </Surface>
      </div>
    </div>
  );
}
