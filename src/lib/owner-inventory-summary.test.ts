import { describe, expect, it } from "vitest";
import { buildOwnerInventorySummary } from "@/lib/owner-inventory-summary";

describe("buildOwnerInventorySummary", () => {
  it("calcule la santé et la valorisation du stock", () => {
    const summary = buildOwnerInventorySummary([
      {
        costPrice: 1_000,
        sellingPrice: 1_500,
        availableStock: 10,
        lowStockThreshold: 3,
      },
      {
        costPrice: 2_000,
        sellingPrice: 3_000,
        availableStock: 2,
        lowStockThreshold: 5,
      },
      {
        costPrice: 5_000,
        sellingPrice: 7_500,
        availableStock: 0,
        lowStockThreshold: 2,
      },
    ]);

    expect(summary).toEqual({
      rowCount: 3,
      totalAvailableStock: 12,
      healthyCount: 1,
      lowStockCount: 1,
      outOfStockCount: 1,
      costValuation: 14_000,
      saleValuation: 21_000,
      potentialMargin: 7_000,
      stockHealthRate: 33,
    });
  });
});
