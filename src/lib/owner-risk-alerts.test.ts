import { describe, expect, it } from "vitest";
import { buildOwnerRiskAlerts } from "@/lib/owner-risk-alerts";

describe("buildOwnerRiskAlerts", () => {
  it("detects completed sales with incomplete payments", () => {
    const alerts = buildOwnerRiskAlerts({
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          receiptNumber: "AFR-001",
          status: "completed",
          totalAmount: 25_000,
          paidAmount: 10_000,
          createdAt: "2026-06-20T10:00:00.000Z",
          afterSaleReason: null,
        },
      ],
      payments: [],
      cashSessions: [],
      stockMovements: [],
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "incomplete_payment",
      severity: "high",
      amount: 15_000,
    });
  });

  it("detects cash differences and after-sale actions", () => {
    const alerts = buildOwnerRiskAlerts({
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          receiptNumber: "AFR-002",
          status: "refunded",
          totalAmount: 130_000,
          paidAmount: 130_000,
          createdAt: "2026-06-21T10:00:00.000Z",
          afterSaleReason: "Client remboursé",
        },
      ],
      payments: [],
      cashSessions: [
        {
          id: "session-1",
          businessId: "business-1",
          storeId: "store-1",
          expectedClosingBalance: 200_000,
          closingBalance: 185_000,
          differenceAmount: -15_000,
          closedAt: "2026-06-21T22:00:00.000Z",
        },
      ],
      stockMovements: [],
    });

    expect(alerts.map((alert) => alert.type)).toEqual([
      "cash_difference",
      "after_sale",
    ]);
    expect(alerts[0]).toMatchObject({
      severity: "high",
      amount: -15_000,
    });
    expect(alerts[1]).toMatchObject({
      severity: "high",
      amount: 130_000,
    });
  });

  it("detects negative stock adjustments", () => {
    const alerts = buildOwnerRiskAlerts({
      sales: [],
      payments: [],
      cashSessions: [],
      stockMovements: [
        {
          id: "movement-1",
          businessId: "business-1",
          storeId: "store-1",
          productId: "product-1",
          productName: "Riz premium",
          movementType: "adjustment",
          quantityDelta: -24,
          reason: "Casse stock",
          createdAt: "2026-06-22T10:00:00.000Z",
        },
      ],
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      type: "stock_adjustment",
      severity: "high",
      quantity: 24,
    });
  });
});
