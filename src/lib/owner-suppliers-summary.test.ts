import { describe, expect, it } from "vitest";
import { buildOwnerSuppliersSummary } from "@/lib/owner-suppliers-summary";

describe("buildOwnerSuppliersSummary", () => {
  it("calcule les KPIs fournisseurs et réceptions", () => {
    const summary = buildOwnerSuppliersSummary({
      suppliers: [
        { phone: "+221770000001", email: null },
        { phone: null, email: "fournisseur@example.com" },
        { phone: null, email: null },
      ],
      receptions: [
        { supplierName: "Grossiste A", quantity: 10, unitCost: 1_000 },
        { supplierName: null, quantity: 5, unitCost: 2_000 },
      ],
    });

    expect(summary).toEqual({
      supplierCount: 3,
      supplierWithContactCount: 2,
      supplierWithoutContactCount: 1,
      contactQualityRate: 67,
      receptionCount: 2,
      receptionWithSupplierCount: 1,
      totalReceivedQuantity: 15,
      totalReceptionValue: 20_000,
      averageReceptionValue: 10_000,
    });
  });
});
