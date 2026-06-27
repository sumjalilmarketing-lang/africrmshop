import { describe, expect, it } from "vitest";
import { buildOwnerTaxReportRows } from "@/lib/owner-tax-reports";

describe("buildOwnerTaxReportRows", () => {
  it("builds monthly tax reports from completed sales, after-sales and deductible expenses", () => {
    const rows = buildOwnerTaxReportRows({
      periodType: "month",
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          status: "completed",
          subtotal: 100_000,
          taxTotal: 18_000,
          totalAmount: 118_000,
          createdAt: "2026-06-05T10:00:00.000Z",
        },
        {
          id: "sale-2",
          businessId: "business-1",
          storeId: "store-1",
          status: "refunded",
          subtotal: 20_000,
          taxTotal: 3_600,
          totalAmount: 23_600,
          createdAt: "2026-06-12T10:00:00.000Z",
        },
      ],
      expenses: [
        {
          id: "expense-1",
          businessId: "business-1",
          storeId: "store-1",
          status: "paid",
          amountExcludingTax: 30_000,
          taxAmount: 5_400,
          totalAmount: 35_400,
          expenseDate: "2026-06-20",
        },
        {
          id: "expense-2",
          businessId: "business-1",
          storeId: "store-1",
          status: "rejected",
          amountExcludingTax: 10_000,
          taxAmount: 1_800,
          totalAmount: 11_800,
          expenseDate: "2026-06-21",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      periodType: "month",
      periodKey: "2026-06",
      businessId: "business-1",
      storeId: "store-1",
      completedSalesCount: 1,
      afterSaleCount: 1,
      deductibleExpenseCount: 1,
      taxableSalesTotal: 100_000,
      outputTaxTotal: 18_000,
      reversedSalesTotal: 20_000,
      reversedOutputTaxTotal: 3_600,
      deductibleExpenseTotal: 30_000,
      inputTaxTotal: 5_400,
      netTaxDue: 9_000,
    });
  });

  it("groups reports by fiscal quarter and keeps non-store expenses separated", () => {
    const rows = buildOwnerTaxReportRows({
      periodType: "quarter",
      sales: [
        {
          id: "sale-1",
          businessId: "business-1",
          storeId: "store-1",
          status: "completed",
          subtotal: 50_000,
          taxTotal: 9_000,
          totalAmount: 59_000,
          createdAt: "2026-02-15T10:00:00.000Z",
        },
        {
          id: "sale-2",
          businessId: "business-1",
          storeId: "store-1",
          status: "cancelled",
          subtotal: 10_000,
          taxTotal: 1_800,
          totalAmount: 11_800,
          createdAt: "2026-03-01T10:00:00.000Z",
        },
      ],
      expenses: [
        {
          id: "expense-1",
          businessId: "business-1",
          storeId: null,
          status: "approved",
          amountExcludingTax: 12_000,
          taxAmount: 2_160,
          totalAmount: 14_160,
          expenseDate: "2026-01-10",
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.periodKey)).toEqual(["2026-Q1", "2026-Q1"]);
    expect(rows.find((row) => row.storeId === "store-1")).toMatchObject({
      taxableSalesTotal: 50_000,
      outputTaxTotal: 9_000,
      reversedOutputTaxTotal: 1_800,
      netTaxDue: 7_200,
    });
    expect(rows.find((row) => row.storeId === null)).toMatchObject({
      deductibleExpenseTotal: 12_000,
      inputTaxTotal: 2_160,
      netTaxDue: -2_160,
    });
  });
});
