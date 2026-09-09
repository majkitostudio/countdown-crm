import { describe, expect, it, vi } from "vitest";
import { refreshProductCatalogAfterMutation } from "@/lib/productCatalogMutation";

describe("refreshProductCatalogAfterMutation", () => {
  it("waits for a successful mutation before replacing the catalog snapshot", async () => {
    const events: string[] = [];
    const mutate = vi.fn(async () => { events.push("mutation"); });
    const refresh = vi.fn(async () => { events.push("refresh"); });

    await refreshProductCatalogAfterMutation(mutate, refresh);

    expect(events).toEqual(["mutation", "refresh"]);
  });

  it("does not refresh when the catalog mutation fails", async () => {
    const failure = new Error("mutation failed");
    const refresh = vi.fn(async () => undefined);

    await expect(refreshProductCatalogAfterMutation(async () => { throw failure; }, refresh)).rejects.toBe(failure);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("propagates a reload failure so the caller retains its existing snapshot", async () => {
    const failure = new Error("reload failed");

    await expect(refreshProductCatalogAfterMutation(async () => undefined, async () => { throw failure; })).rejects.toBe(failure);
  });
});
