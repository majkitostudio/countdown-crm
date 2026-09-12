import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("product component visual contract", () => {
  it("adopts the shared console primitives for product cards and editor overlays", () => {
    const productCard = source("src/components/products/ProductCard.tsx");
    const productModal = source("src/components/products/ProductModal.tsx");
    const objectionDrawer = source("src/components/products/ObjectionDrawer.tsx");
    const objectionEditor = source("src/components/products/ObjectionEditorModal.tsx");
    const transcriptUploader = source("src/components/products/CallTranscriptUploaderModal.tsx");

    expect(productCard).toContain('import { Button } from "@/components/ui/Button"');
    expect(productCard).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(productCard).toContain('import { StatusBadge } from "@/components/ui/Status"');
    expect(productModal).toContain('import { Button } from "@/components/ui/Button"');
    expect(productModal).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(productModal).toContain('import { StatusAlert } from "@/components/ui/Status"');
    expect(objectionDrawer).toContain('import { Button } from "@/components/ui/Button"');
    expect(objectionDrawer).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(objectionDrawer).toContain('import { StatusAlert } from "@/components/ui/Status"');
    expect(objectionEditor).toContain('import { Button } from "@/components/ui/Button"');
    expect(objectionEditor).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(objectionEditor).toContain('import { StatusAlert } from "@/components/ui/Status"');
    expect(transcriptUploader).toContain('import { Button } from "@/components/ui/Button"');
    expect(transcriptUploader).toContain('import { Surface } from "@/components/ui/Surface"');
    expect(transcriptUploader).toContain('import { StatusAlert } from "@/components/ui/Status"');
  });
});
