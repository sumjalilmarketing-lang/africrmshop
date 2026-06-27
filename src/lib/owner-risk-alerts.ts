export type RiskSeverity = "low" | "medium" | "high";

export type RiskAlertType =
  | "cash_difference"
  | "incomplete_payment"
  | "after_sale"
  | "stock_adjustment";

export type RiskSaleInput = {
  id: string;
  businessId: string;
  storeId: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
  afterSaleReason: string | null;
};

export type RiskPaymentInput = {
  saleId: string;
  amount: number;
  status: string;
};

export type RiskCashSessionInput = {
  id: string;
  businessId: string;
  storeId: string;
  expectedClosingBalance: number;
  closingBalance: number;
  differenceAmount: number;
  closedAt: string;
};

export type RiskStockMovementInput = {
  id: string;
  businessId: string;
  storeId: string;
  productId: string;
  productName: string;
  movementType: string;
  quantityDelta: number;
  reason: string | null;
  createdAt: string;
};

export type RiskAlert = {
  id: string;
  type: RiskAlertType;
  severity: RiskSeverity;
  businessId: string;
  storeId: string;
  sourceId: string;
  sourceLabel: string;
  title: string;
  description: string;
  amount: number | null;
  quantity: number | null;
  occurredAt: string;
};

function getPaymentTotal(payments: RiskPaymentInput[]) {
  return payments
    .filter((payment) => payment.status === "completed")
    .reduce((total, payment) => total + payment.amount, 0);
}

function getCashDifferenceSeverity(input: {
  differenceAmount: number;
  expectedClosingBalance: number;
}): RiskSeverity {
  const absoluteDifference = Math.abs(input.differenceAmount);
  const differenceRatio =
    input.expectedClosingBalance > 0
      ? absoluteDifference / input.expectedClosingBalance
      : 0;

  if (absoluteDifference >= 10_000 || differenceRatio >= 0.05) return "high";
  if (absoluteDifference >= 2_000 || differenceRatio >= 0.02) return "medium";

  return "low";
}

function getAfterSaleSeverity(totalAmount: number): RiskSeverity {
  if (totalAmount >= 100_000) return "high";
  if (totalAmount >= 25_000) return "medium";

  return "low";
}

function getStockAdjustmentSeverity(quantityDelta: number): RiskSeverity {
  const absoluteQuantity = Math.abs(quantityDelta);
  if (quantityDelta < 0 && absoluteQuantity >= 20) return "high";
  if (quantityDelta < 0 && absoluteQuantity >= 5) return "medium";

  return "low";
}

export function buildOwnerRiskAlerts(input: {
  sales: RiskSaleInput[];
  payments: RiskPaymentInput[];
  cashSessions: RiskCashSessionInput[];
  stockMovements: RiskStockMovementInput[];
}) {
  const alerts: RiskAlert[] = [];
  const paymentsBySaleId = new Map<string, RiskPaymentInput[]>();

  for (const payment of input.payments) {
    paymentsBySaleId.set(payment.saleId, [
      ...(paymentsBySaleId.get(payment.saleId) ?? []),
      payment,
    ]);
  }

  for (const sale of input.sales) {
    const salePayments = paymentsBySaleId.get(sale.id) ?? [];
    const paymentTotal = Math.max(
      sale.paidAmount,
      getPaymentTotal(salePayments),
    );
    const missingAmount = sale.totalAmount - paymentTotal;

    if (sale.status === "completed" && missingAmount > 0) {
      alerts.push({
        id: `incomplete-payment:${sale.id}`,
        type: "incomplete_payment",
        severity: missingAmount >= 10_000 ? "high" : "medium",
        businessId: sale.businessId,
        storeId: sale.storeId,
        sourceId: sale.id,
        sourceLabel: sale.receiptNumber,
        title: "Vente terminée avec paiement incomplet",
        description: `Paiement manquant estimé : ${missingAmount.toLocaleString(
          "fr-SN",
        )} XOF.`,
        amount: missingAmount,
        quantity: null,
        occurredAt: sale.createdAt,
      });
    }

    if (sale.status === "cancelled" || sale.status === "refunded") {
      const actionLabel =
        sale.status === "refunded" ? "remboursement" : "annulation";

      alerts.push({
        id: `after-sale:${sale.id}`,
        type: "after_sale",
        severity: getAfterSaleSeverity(sale.totalAmount),
        businessId: sale.businessId,
        storeId: sale.storeId,
        sourceId: sale.id,
        sourceLabel: sale.receiptNumber,
        title: `Action après-vente : ${actionLabel}`,
        description:
          sale.afterSaleReason ??
          "Contrôler le motif, l'autorisation et l'impact stock/caisse.",
        amount: sale.totalAmount,
        quantity: null,
        occurredAt: sale.createdAt,
      });
    }
  }

  for (const session of input.cashSessions) {
    const absoluteDifference = Math.abs(session.differenceAmount);
    if (absoluteDifference <= 0) continue;

    alerts.push({
      id: `cash-difference:${session.id}`,
      type: "cash_difference",
      severity: getCashDifferenceSeverity(session),
      businessId: session.businessId,
      storeId: session.storeId,
      sourceId: session.id,
      sourceLabel: "Session caisse",
      title: "Écart de caisse détecté",
      description:
        session.differenceAmount > 0
          ? "La caisse contient plus que le montant attendu."
          : "La caisse contient moins que le montant attendu.",
      amount: session.differenceAmount,
      quantity: null,
      occurredAt: session.closedAt,
    });
  }

  for (const movement of input.stockMovements) {
    if (movement.movementType !== "adjustment" || movement.quantityDelta >= 0) {
      continue;
    }

    alerts.push({
      id: `stock-adjustment:${movement.id}`,
      type: "stock_adjustment",
      severity: getStockAdjustmentSeverity(movement.quantityDelta),
      businessId: movement.businessId,
      storeId: movement.storeId,
      sourceId: movement.id,
      sourceLabel: movement.productName,
      title: "Ajustement négatif de stock",
      description:
        movement.reason ??
        "Contrôler l'origine de la sortie de stock et la personne responsable.",
      amount: null,
      quantity: Math.abs(movement.quantityDelta),
      occurredAt: movement.createdAt,
    });
  }

  return alerts.sort((first, second) =>
    second.occurredAt.localeCompare(first.occurredAt),
  );
}
