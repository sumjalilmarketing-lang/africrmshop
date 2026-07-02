import { describe, expect, it } from "vitest";
import { buildOwnerSalesSummary } from "@/lib/owner-sales-summary";

describe("buildOwnerSalesSummary", () => {
  it("calcule les KPIs de ventes owner", () => {
    const summary = buildOwnerSalesSummary([
      {
        status: "completed",
        totalAmount: 20_000,
        paidAmount: 20_000,
        taxTotal: 1_500,
      },
      {
        status: "completed",
        totalAmount: 10_000,
        paidAmount: 9_000,
        taxTotal: 750,
      },
      {
        status: "cancelled",
        totalAmount: 5_000,
        paidAmount: 0,
        taxTotal: 0,
      },
      {
        status: "refunded",
        totalAmount: 7_500,
        paidAmount: 0,
        taxTotal: 0,
      },
    ]);

    expect(summary).toEqual({
      saleCount: 4,
      completedCount: 2,
      cancelledCount: 1,
      refundedCount: 1,
      completedTotal: 30_000,
      afterSaleTotal: 12_500,
      taxTotal: 2_250,
      averageBasket: 15_000,
      paymentGapCount: 1,
      paymentGapAmount: 1_000,
      paymentControlRate: 50,
    });
  });
});
