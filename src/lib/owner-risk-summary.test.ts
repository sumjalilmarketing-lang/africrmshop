import { describe, expect, it } from "vitest";
import { buildOwnerRiskSummary } from "@/lib/owner-risk-summary";

describe("buildOwnerRiskSummary", () => {
  it("agrège les alertes anti-fraude par gravité, montant et quantité", () => {
    const summary = buildOwnerRiskSummary([
      {
        type: "cash_difference",
        severity: "high",
        amount: -5_000,
        quantity: null,
      },
      {
        type: "incomplete_payment",
        severity: "medium",
        amount: 12_000,
        quantity: null,
      },
      {
        type: "after_sale",
        severity: "high",
        amount: 30_000,
        quantity: null,
      },
      {
        type: "stock_adjustment",
        severity: "low",
        amount: null,
        quantity: 7,
      },
    ]);

    expect(summary).toEqual({
      alertCount: 4,
      highCount: 2,
      mediumCount: 1,
      lowCount: 1,
      cashDifferenceAmount: 5_000,
      incompletePaymentAmount: 12_000,
      afterSaleAmount: 30_000,
      stockAdjustmentQuantity: 7,
      monetaryRiskAmount: 47_000,
      criticalRate: 50,
    });
  });

  it("retourne un résumé neutre quand aucune alerte n'est détectée", () => {
    expect(buildOwnerRiskSummary([])).toEqual({
      alertCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      cashDifferenceAmount: 0,
      incompletePaymentAmount: 0,
      afterSaleAmount: 0,
      stockAdjustmentQuantity: 0,
      monetaryRiskAmount: 0,
      criticalRate: 0,
    });
  });
});
