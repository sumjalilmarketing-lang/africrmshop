import { describe, expect, it } from "vitest";
import { buildOwnerFinancialReportRows } from "./owner-financial-reports";

describe("buildOwnerFinancialReportRows", () => {
  it("agrège les ventes, remboursements, paiements et écarts par jour", () => {
    const rows = buildOwnerFinancialReportRows({
      periodType: "day",
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          status: "completed",
          subtotal: 10000,
          taxTotal: 1800,
          totalAmount: 11800,
          createdAt: "2026-06-27T09:30:00.000Z",
        },
        {
          id: "sale-2",
          businessId: "business-1",
          storeId: "store-1",
          status: "refunded",
          subtotal: 5000,
          taxTotal: 900,
          totalAmount: 5900,
          createdAt: "2026-06-27T10:45:00.000Z",
        },
        {
          id: "sale-3",
          businessId: "business-1",
          storeId: "store-1",
          status: "cancelled",
          subtotal: 2000,
          taxTotal: 360,
          totalAmount: 2360,
          createdAt: "2026-06-27T11:20:00.000Z",
        },
      ],
      payments: [
        {
          saleId: "sale-1",
          provider: "cash",
          amount: 8000,
          status: "completed",
        },
        {
          saleId: "sale-1",
          provider: "wave",
          amount: 3800,
          status: "completed",
        },
        {
          saleId: "sale-2",
          provider: "cash",
          amount: 5900,
          status: "refunded",
        },
      ],
      cashSessions: [
        {
          id: "session-1",
          businessId: "business-1",
          storeId: "store-1",
          closedAt: "2026-06-27T19:00:00.000Z",
          differenceAmount: -500,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      periodType: "day",
      periodKey: "2026-06-27",
      businessId: "business-1",
      storeId: "store-1",
      completedSalesCount: 1,
      refundedSalesCount: 1,
      cancelledSalesCount: 1,
      grossSalesTotal: 11800,
      refundedTotal: 5900,
      cancelledTotal: 2360,
      afterSaleTotal: 8260,
      netSalesTotal: 5900,
      subtotalTotal: 10000,
      taxCollectedTotal: 1800,
      taxReversedTotal: 1260,
      cashTotal: 8000,
      mobileMoneyTotal: 3800,
      refundedPaymentTotal: 5900,
      cashDifferenceTotal: -500,
    });
  });

  it("agrège les mêmes données par mois", () => {
    const rows = buildOwnerFinancialReportRows({
      periodType: "month",
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          status: "completed",
          subtotal: 1000,
          taxTotal: 180,
          totalAmount: 1180,
          createdAt: "2026-06-01T09:00:00.000Z",
        },
        {
          id: "sale-2",
          businessId: "business-1",
          storeId: "store-1",
          status: "completed",
          subtotal: 2000,
          taxTotal: 360,
          totalAmount: 2360,
          createdAt: "2026-06-27T09:00:00.000Z",
        },
      ],
      payments: [],
      cashSessions: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      periodType: "month",
      periodKey: "2026-06",
      grossSalesTotal: 3540,
      taxCollectedTotal: 540,
      completedSalesCount: 2,
    });
  });
});
