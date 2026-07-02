import { describe, expect, it } from "vitest";
import { buildOwnerCashControlSummary } from "@/lib/owner-cash-control";

describe("buildOwnerCashControlSummary", () => {
  it("calcule un contrôle cash équilibré", () => {
    const summary = buildOwnerCashControlSummary([
      {
        differenceAmount: 0,
        cashSalesTotal: 25_000,
        mobileMoneyTotal: 10_000,
        salesCount: 4,
      },
      {
        differenceAmount: 0,
        cashSalesTotal: 15_000,
        mobileMoneyTotal: 7_500,
        salesCount: 2,
      },
    ]);

    expect(summary).toMatchObject({
      reportCount: 2,
      balancedReportCount: 2,
      gapReportCount: 0,
      totalCashSales: 40_000,
      totalMobileMoney: 17_500,
      netDifferenceAmount: 0,
      absoluteDifferenceAmount: 0,
      reconciliationRate: 100,
      severity: "balanced",
    });
  });

  it("classe une période avec beaucoup d'écarts en critique", () => {
    const summary = buildOwnerCashControlSummary([
      {
        differenceAmount: -15_000,
        cashSalesTotal: 50_000,
        mobileMoneyTotal: 20_000,
        salesCount: 8,
      },
      {
        differenceAmount: 5_000,
        cashSalesTotal: 30_000,
        mobileMoneyTotal: 12_500,
        salesCount: 5,
      },
    ]);

    expect(summary).toMatchObject({
      reportCount: 2,
      balancedReportCount: 0,
      gapReportCount: 2,
      netDifferenceAmount: -10_000,
      absoluteDifferenceAmount: 20_000,
      reconciliationRate: 0,
      severity: "critical",
    });
  });
});
