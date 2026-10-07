"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, PackageCheck, Truck } from "lucide-react";
import type { WorkspaceOrderDTO } from "@/lib/dal/activity";
import { exportOrdersToCarrierCsv, type CarrierFormat } from "@/lib/carrierExport";
import { Button, type ButtonVariant } from "@/components/ui/Button";

interface CarrierExportOption {
  format: CarrierFormat;
  label: string;
  description: string;
  badge: string;
}

const CARRIER_OPTIONS: CarrierExportOption[] = [
  {
    format: "zasilkovna",
    label: "Zásilkovna (Packeta)",
    description: "Importní CSV pro doručení na adresu i výdejní místa",
    badge: "Packeta",
  },
  {
    format: "balikovna",
    label: "Česká pošta (Balíkovna)",
    description: "CSV pro import do systému Podání online",
    badge: "ČP",
  },
  {
    format: "gls",
    label: "GLS",
    description: "CSV pro import do systému MyGLS / GLS Connect",
    badge: "GLS",
  },
  {
    format: "universal",
    label: "Univerzální expediční CSV",
    description: "Kompletní přehled s adresami a dobírkou pro Excel",
    badge: "Excel",
  },
];

export interface CarrierExportDropdownProps {
  orders: WorkspaceOrderDTO[];
  label?: string;
  variant?: ButtonVariant;
  className?: string;
  align?: "left" | "right";
  dataTestId?: string;
  onExport?: (format: CarrierFormat, count: number) => void;
}

export function CarrierExportDropdown({
  orders,
  label = "Export pro dopravce",
  variant = "secondary",
  className,
  align = "right",
  dataTestId = "carrier-export-dropdown",
  onExport,
}: CarrierExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const disabled = orders.length === 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function handleSelectFormat(format: CarrierFormat) {
    setIsOpen(false);
    if (orders.length === 0) return;

    exportOrdersToCarrierCsv(orders, {
      format,
      filenamePrefix: `expedice_${orders.length}_objednavek`,
    });

    onExport?.(format, orders.length);
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className || ""}`} data-testid={dataTestId}>
      <Button
        type="button"
        variant={variant}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-testid={`${dataTestId}-trigger`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown
          className={`h-3 w-3 opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </Button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute z-30 mt-2 w-72 rounded-xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-md ${
            align === "right" ? "right-0" : "left-0"
          }`}
          data-testid={`${dataTestId}-menu`}
        >
          <div className="border-b border-zinc-800/80 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Formát exportu štítků
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {orders.length} {orders.length === 1 ? "objednávka" : orders.length < 5 ? "objednávky" : "objednávek"} k exportu
            </p>
          </div>

          <div className="mt-1 space-y-0.5">
            {CARRIER_OPTIONS.map((option) => (
              <button
                key={option.format}
                type="button"
                role="menuitem"
                onClick={() => handleSelectFormat(option.format)}
                data-testid={`export-option-${option.format}`}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/60 focus:bg-zinc-800/80 focus:outline-none"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300">
                  {option.format === "universal" ? (
                    <FileSpreadsheet className="h-4 w-4" />
                  ) : option.format === "balikovna" ? (
                    <PackageCheck className="h-4 w-4" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-zinc-200">{option.label}</span>
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      {option.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
