import { describe, expect, it } from "vitest";
import { buildOwnerTaxSummary } from "@/lib/owner-tax-summary";

describe("buildOwnerTaxSummary", () => {
  it("calcule les KPIs TVA owner", () => {
    const summary = buildOwnerTaxSummary([
      {
        completedSalesCount: 5,
        afterSaleCount: 1,
        deductibleExpenseCount: 2,
        taxableSalesTotal: 100_000,
        outputTaxTotal: 18_000,
        reversedOutputTaxTotal: 3_600,
        deductibleExpenseTotal: 30_000,
        inputTaxTotal: 5_400,
        netTaxDue: 9_000,
      },
      {
        completedSalesCount: 2,
        afterSaleCount: 0,
        deductibleExpenseCount: 1,
        taxableSalesTotal: 50_000,
        outputTaxTotal: 9_000,
        reversedOutputTaxTotal: 0,
        deductibleExpenseTotal: 10_000,
        inputTaxTotal: 1_800,
        netTaxDue: 7_200,
      },
    ]);

    expect(summary).toEqual({
      rowCount: 2,
      completedSalesCount: 7,
      afterSaleCount: 1,
      deductibleExpenseCount: 3,
      taxableSalesTotal: 150_000,
      outputTaxTotal: 27_000,
      reversedOutputTaxTotal: 3_600,
      deductibleExpenseTotal: 40_000,
      inputTaxTotal: 7_200,
      netTaxDue: 16_200,
      netCollectedTax: 23_400,
      effectiveTaxRate: 16,
      deductibleCoverageRate: 31,
    });
  });
});
