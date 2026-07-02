import { describe, expect, it } from "vitest";
import { buildOwnerExpensesSummary } from "@/lib/owner-expenses-summary";

describe("buildOwnerExpensesSummary", () => {
  it("calcule les KPIs de contrôle des dépenses", () => {
    const summary = buildOwnerExpensesSummary([
      {
        status: "pending",
        taxAmount: 1_800,
        totalAmount: 11_800,
        documentCount: 1,
      },
      {
        status: "paid",
        taxAmount: 900,
        totalAmount: 5_900,
        documentCount: 0,
      },
      {
        status: "rejected",
        taxAmount: 0,
        totalAmount: 2_500,
        documentCount: 1,
      },
    ]);

    expect(summary).toEqual({
      expenseCount: 3,
      totalExpenses: 20_200,
      totalTax: 2_700,
      draftCount: 0,
      pendingCount: 1,
      approvedCount: 0,
      paidCount: 1,
      rejectedCount: 1,
      missingDocumentCount: 1,
      documentComplianceRate: 67,
      approvalRate: 67,
    });
  });
});
