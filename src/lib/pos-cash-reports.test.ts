import { describe, expect, it } from "vitest";
import { buildCashSessionReports } from "@/lib/pos-cash-reports";

describe("buildCashSessionReports", () => {
  it("calcule un rapport Z avec ventes cash, mobile money et mouvements", () => {
    const reports = buildCashSessionReports({
      sessions: [
        {
          id: "session-1",
          businessId: "business-1",
          storeId: "store-1",
          openedAt: "2026-06-27T08:00:00.000Z",
          closedAt: "2026-06-27T18:00:00.000Z",
          openingBalance: 10000,
          expectedClosingBalance: 28000,
          closingBalance: 27500,
          differenceAmount: -500,
          notes: null,
          openedByName: "Caissier",
          closedByName: "Manager",
        },
      ],
      sales: [
        {
          id: "sale-1",
          storeId: "store-1",
          createdAt: "2026-06-27T09:00:00.000Z",
          totalAmount: 15000,
        },
        {
          id: "sale-2",
          storeId: "store-1",
          createdAt: "2026-06-27T10:00:00.000Z",
          totalAmount: 8000,
        },
      ],
      payments: [
        { saleId: "sale-1", provider: "cash", amount: 15000 },
        { saleId: "sale-2", provider: "mobile_money", amount: 8000 },
      ],
      movements: [
        {
          id: "movement-1",
          cashSessionId: "session-1",
          movementType: "cash_in",
          amount: 5000,
          reason: "Ajout monnaie",
          createdAt: "2026-06-27T11:00:00.000Z",
        },
        {
          id: "movement-2",
          cashSessionId: "session-1",
          movementType: "cash_out",
          amount: 2000,
          reason: "Dépôt coffre",
          createdAt: "2026-06-27T12:00:00.000Z",
        },
      ],
    });

    expect(reports[0]).toMatchObject({
      salesCount: 2,
      cashSalesTotal: 15000,
      mobileMoneyTotal: 8000,
      manualCashInTotal: 5000,
      manualCashOutTotal: 2000,
      grossSalesTotal: 23000,
      calculatedExpectedCash: 28000,
    });
  });
});
