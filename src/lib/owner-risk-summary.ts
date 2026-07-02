import type { RiskAlertType, RiskSeverity } from "@/lib/owner-risk-alerts";

export type OwnerRiskSummaryAlertInput = {
  type: RiskAlertType;
  severity: RiskSeverity;
  amount: number | null;
  quantity: number | null;
};

export type OwnerRiskSummary = {
  alertCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  cashDifferenceAmount: number;
  incompletePaymentAmount: number;
  afterSaleAmount: number;
  stockAdjustmentQuantity: number;
  monetaryRiskAmount: number;
  criticalRate: number;
};

export function buildOwnerRiskSummary(
  alerts: OwnerRiskSummaryAlertInput[],
): OwnerRiskSummary {
  const summary = alerts.reduce<OwnerRiskSummary>(
    (accumulator, alert) => {
      if (alert.severity === "high") {
        accumulator.highCount += 1;
      }

      if (alert.severity === "medium") {
        accumulator.mediumCount += 1;
      }

      if (alert.severity === "low") {
        accumulator.lowCount += 1;
      }

      if (alert.type === "cash_difference") {
        accumulator.cashDifferenceAmount += Math.abs(alert.amount ?? 0);
      }

      if (alert.type === "incomplete_payment") {
        accumulator.incompletePaymentAmount += Math.max(alert.amount ?? 0, 0);
      }

      if (alert.type === "after_sale") {
        accumulator.afterSaleAmount += Math.max(alert.amount ?? 0, 0);
      }

      if (alert.type === "stock_adjustment") {
        accumulator.stockAdjustmentQuantity += Math.abs(alert.quantity ?? 0);
      }

      return accumulator;
    },
    {
      alertCount: alerts.length,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      cashDifferenceAmount: 0,
      incompletePaymentAmount: 0,
      afterSaleAmount: 0,
      stockAdjustmentQuantity: 0,
      monetaryRiskAmount: 0,
      criticalRate: 0,
    },
  );

  summary.monetaryRiskAmount =
    summary.cashDifferenceAmount +
    summary.incompletePaymentAmount +
    summary.afterSaleAmount;
  summary.criticalRate =
    summary.alertCount === 0
      ? 0
      : Math.round((summary.highCount / summary.alertCount) * 100);

  return summary;
}
