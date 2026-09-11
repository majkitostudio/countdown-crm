import { renderToStaticMarkup } from "react-dom/server";
import { PhoneCall } from "lucide-react";
import {
  PageHeader,
  getPageHeaderBadgeClassName,
  getPageHeaderSurfaceClassName,
} from "@/components/layout/PageHeader";
import { getStatusClassName } from "@/components/ui/Status";
import { getSurfaceClassName } from "@/components/ui/Surface";
import { expect, it } from "vitest";

it("renders the canonical page header with the shared page surface", () => {
  const markup = renderToStaticMarkup(
    <PageHeader icon={PhoneCall} title="Orders" description="Review and manage orders." />,
  );

  expect(getPageHeaderSurfaceClassName()).toBe(getSurfaceClassName("page"));
  expect(markup).toContain(getPageHeaderSurfaceClassName());
  expect(markup).toContain("rounded-2xl");
});

it("maps unavailable and ordinary header badges to neutral", () => {
  expect(getPageHeaderBadgeClassName("neutral")).toBe(getStatusClassName("neutral"));
  expect(getPageHeaderBadgeClassName("unavailable")).toBe(getStatusClassName("neutral"));
});
