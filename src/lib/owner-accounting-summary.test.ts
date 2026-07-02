import { describe, expect, it } from "vitest";
import { buildOwnerAccountingSummary } from "@/lib/owner-accounting-summary";

describe("buildOwnerAccountingSummary", () => {
  it("calcule les KPIs du journal comptable assisté", () => {
    const summary = buildOwnerAccountingSummary([
      {
        sourceType: "sale",
        totalDebit: 11_800,
        totalCredit: 11_800,
        isBalanced: true,
      },
      {
        sourceType: "expense",
        totalDebit: 5_900,
        totalCredit: 5_900,
        isBalanced: true,
      },
      {
        sourceType: "refund",
        totalDebit: 3_000,
        totalCredit: 2_500,
        isBalanced: false,
      },
    ]);

    expect(summary).toEqual({
      entryCount: 3,
      saleEntryCount: 1,
      refundEntryCount: 1,
      expenseEntryCount: 1,
      totalDebit: 20_700,
      totalCredit: 20_200,
      unbalancedEntryCount: 1,
      balanceGapAmount: 500,
      balancedRate: 67,
    });
  });
});
