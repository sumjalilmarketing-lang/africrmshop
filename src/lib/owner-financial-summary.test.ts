import { describe, expect, it } from "vitest";
import { buildOwnerFinancialSummary } from "@/lib/owner-financial-summary";

describe("buildOwnerFinancialSummary", () => {
  it("calcule les KPIs financiers owner", () => {
    const summary = buildOwnerFinancialSummary([
      {
        completedSalesCount: 3,
        cancelledSalesCount: 1,
        refundedSalesCount: 1,
        grossSalesTotal: 100_000,
        afterSaleTotal: 15_000,
        netSalesTotal: 85_000,
        taxCollectedTotal: 15_250,
        taxReversedTotal: 2_700,
        cashTotal: 40_000,
        mobileMoneyTotal: 45_000,
        refundedPaymentTotal: 15_000,
        cashDifferenceTotal: -1_000,
      },
      {
        completedSalesCount: 1,
        cancelledSalesCount: 0,
        refundedSalesCount: 0,
        grossSalesTotal: 20_000,
        afterSaleTotal: 0,
        netSalesTotal: 20_000,
        taxCollectedTotal: 3_600,
        taxReversedTotal: 0,
        cashTotal: 20_000,
        mobileMoneyTotal: 0,
        refundedPaymentTotal: 0,
        cashDifferenceTotal: 0,
      },
    ]);

    expect(summary).toEqual({
      rowCount: 2,
      completedSalesCount: 4,
      cancelledSalesCount: 1,
      refundedSalesCount: 1,
      grossSalesTotal: 120_000,
      afterSaleTotal: 15_000,
      netSalesTotal: 105_000,
      taxCollectedTotal: 18_850,
      taxReversedTotal: 2_700,
      cashTotal: 60_000,
      mobileMoneyTotal: 45_000,
      refundedPaymentTotal: 15_000,
      cashDifferenceTotal: -1_000,
      afterSaleRate: 13,
      mobileMoneyShareRate: 43,
      cashDifferenceRate: 2,
    });
  });
});
