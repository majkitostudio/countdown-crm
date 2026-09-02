import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrders } from "@/lib/orders";
import { getLeads } from "@/lib/leads";
import { getProducts } from "@/lib/products";
import { getReorderOpportunities } from "@/lib/reorder";

vi.mock("@/lib/orders", () => ({ getOrders: vi.fn() }));
vi.mock("@/lib/leads", () => ({ getLeads: vi.fn() }));
vi.mock("@/lib/products", () => ({ getProducts: vi.fn() }));

const mockedGetOrders = vi.mocked(getOrders);
const mockedGetLeads = vi.mocked(getLeads);
const mockedGetProducts = vi.mocked(getProducts);

const order = (id: string, createdAt: string, status: "completed" | "delivered" | "cancelled", productId = "product-1") => ({
  id,
  lead_id: "lead-1",
  lead_name: "Test customer",
  product_id: productId,
  product_title: "Test product",
  total_amount: 100,
  currency: "USD",
  items: [],
  status,
  order_source: "manual" as const,
  source_note: null,
  status_history: [],
  agent_name: "Test operator",
  created_at: createdAt,
});

describe("re-order opportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetLeads.mockResolvedValue([
      {
        id: "lead-1",
        full_name: "Test customer",
        phone: "+420000000000",
        email: null,
        city: null,
        country: "CZ",
        status: "customer",
        ai_score: 80,
        notes: null,
        company: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    mockedGetProducts.mockResolvedValue([
      {
        id: "product-1",
        title: "Test product",
        category: "supplements",
        price: 100,
        currency: "USD",
        description: "Test product description",
        image_url: "",
        in_stock: true,
        created_at: "2026-01-01T00:00:00.000Z",
        objections: [],
      },
      {
        id: "product-2",
        title: "Other product",
        category: "supplements",
        price: 100,
        currency: "USD",
        description: "Other product description",
        image_url: "",
        in_stock: true,
        created_at: "2026-01-01T00:00:00.000Z",
        objections: [],
      },
    ]);
  });

  it("only returns fulfilled orders due within the promised 14-day window", async () => {
    const now = Date.now();
    mockedGetOrders.mockResolvedValue([
      order("due", new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(), "completed"),
      order("not-due", new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), "delivered", "product-2"),
      order("cancelled", new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(), "cancelled"),
    ]);

    const opportunities = await getReorderOpportunities();

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.id).toBe("reorder-due");
    expect(opportunities[0]?.days_remaining).toBeGreaterThanOrEqual(4);
    expect(opportunities[0]?.days_remaining).toBeLessThanOrEqual(6);
  });

  it("uses only the latest fulfilled order for the same lead and product", async () => {
    const now = Date.now();
    mockedGetOrders.mockResolvedValue([
      order("old", new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(), "completed"),
      order("latest", new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(), "delivered"),
    ]);

    const opportunities = await getReorderOpportunities();

    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]?.id).toBe("reorder-latest");
    expect(opportunities[0]?.last_order_date).toBe(
      new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });
});
