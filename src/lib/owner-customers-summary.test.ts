import { describe, expect, it } from "vitest";
import { buildOwnerCustomersSummary } from "@/lib/owner-customers-summary";

describe("buildOwnerCustomersSummary", () => {
  it("calcule les KPIs CRM owner", () => {
    const referenceTime = new Date("2026-07-02T12:00:00.000Z").getTime();

    const summary = buildOwnerCustomersSummary(
      [
        {
          phone: "+221770000001",
          email: null,
          totalSpent: 75_000,
          saleCount: 3,
          lastSaleAt: "2026-06-25T09:00:00.000Z",
        },
        {
          phone: null,
          email: "client@example.com",
          totalSpent: 15_000,
          saleCount: 1,
          lastSaleAt: "2026-04-01T09:00:00.000Z",
        },
        {
          phone: null,
          email: null,
          totalSpent: 0,
          saleCount: 0,
          lastSaleAt: null,
        },
      ],
      referenceTime,
    );

    expect(summary).toEqual({
      customerCount: 3,
      totalSpent: 90_000,
      vipCount: 1,
      activeCount: 1,
      inactiveCount: 2,
      incompleteContactCount: 1,
      averageRevenuePerCustomer: 30_000,
      averageBasket: 22_500,
      contactQualityRate: 67,
    });
  });
});
