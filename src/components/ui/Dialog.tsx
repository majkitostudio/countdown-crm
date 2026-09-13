"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";

export type DialogSize = "sm" | "md" | "lg";

const DIALOG_PANEL_CLASS_NAMES: Record<DialogSize, string> = {
  sm: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-sm",
  md: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-md",
  lg: "relative z-10 w-full max-h-[90vh] overflow-y-auto md:max-w-2xl",
};

export function getDialogPanelClassName(size: DialogSize): string {
  return DIALOG_PANEL_CLASS_NAMES[size];
}

interface DialogProps {
  "aria-labelledby": string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: DialogSize;
}

export function Dialog({ children, isOpen, onClose, size = "md", "aria-labelledby": ariaLabelledby }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 backdrop-blur-xs md:items-center md:justify-center md:p-4">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className={getDialogPanelClassName(size)}>
        <Surface
          ref={dialogRef}
          variant="overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledby}
          tabIndex={-1}
          className="w-full"
        >
          {children}
        </Surface>
      </div>
    </div>
  );
}
