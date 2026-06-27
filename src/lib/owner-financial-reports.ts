export type FinancialSaleStatus = "completed" | "cancelled" | "refunded";

export type FinancialSaleInput = {
  id: string;
  businessId: string;
  storeId: string;
  status: FinancialSaleStatus | string;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  createdAt: string;
};

export type FinancialPaymentInput = {
  saleId: string;
  provider: string;
  amount: number;
  status: string;
};

export type FinancialCashSessionInput = {
  id: string;
  businessId: string;
  storeId: string;
  closedAt: string;
  differenceAmount: number;
};

export type FinancialReportPeriod = "day" | "month";

export type FinancialReportRow = {
  periodType: FinancialReportPeriod;
  periodKey: string;
  businessId: string;
  storeId: string;
  completedSalesCount: number;
  cancelledSalesCount: number;
  refundedSalesCount: number;
  grossSalesTotal: number;
  cancelledTotal: number;
  refundedTotal: number;
  afterSaleTotal: number;
  netSalesTotal: number;
  subtotalTotal: number;
  taxCollectedTotal: number;
  taxReversedTotal: number;
  cashTotal: number;
  mobileMoneyTotal: number;
  refundedPaymentTotal: number;
  cashDifferenceTotal: number;
};

function createEmptyReport(input: {
  periodType: FinancialReportPeriod;
  periodKey: string;
  businessId: string;
  storeId: string;
}): FinancialReportRow {
  return {
    ...input,
    completedSalesCount: 0,
    cancelledSalesCount: 0,
    refundedSalesCount: 0,
    grossSalesTotal: 0,
    cancelledTotal: 0,
    refundedTotal: 0,
    afterSaleTotal: 0,
    netSalesTotal: 0,
    subtotalTotal: 0,
    taxCollectedTotal: 0,
    taxReversedTotal: 0,
    cashTotal: 0,
    mobileMoneyTotal: 0,
    refundedPaymentTotal: 0,
    cashDifferenceTotal: 0,
  };
}

function getPeriodKey(value: string, periodType: FinancialReportPeriod) {
  return periodType === "month" ? value.slice(0, 7) : value.slice(0, 10);
}

function getReportKey(input: {
  periodType: FinancialReportPeriod;
  periodKey: string;
  businessId: string;
  storeId: string;
}) {
  return [
    input.periodType,
    input.periodKey,
    input.businessId,
    input.storeId,
  ].join(":");
}

function getOrCreateReport(
  reports: Map<string, FinancialReportRow>,
  input: {
    periodType: FinancialReportPeriod;
    periodKey: string;
    businessId: string;
    storeId: string;
  },
) {
  const key = getReportKey(input);
  const existingReport = reports.get(key);
  if (existingReport) return existingReport;

  const report = createEmptyReport(input);
  reports.set(key, report);

  return report;
}

export function buildOwnerFinancialReportRows(input: {
  sales: FinancialSaleInput[];
  payments: FinancialPaymentInput[];
  cashSessions: FinancialCashSessionInput[];
  periodType: FinancialReportPeriod;
}) {
  const reports = new Map<string, FinancialReportRow>();
  const paymentsBySaleId = new Map<string, FinancialPaymentInput[]>();

  for (const payment of input.payments) {
    paymentsBySaleId.set(payment.saleId, [
      ...(paymentsBySaleId.get(payment.saleId) ?? []),
      payment,
    ]);
  }

  for (const sale of input.sales) {
    const periodKey = getPeriodKey(sale.createdAt, input.periodType);
    const report = getOrCreateReport(reports, {
      periodType: input.periodType,
      periodKey,
      businessId: sale.businessId,
      storeId: sale.storeId,
    });
    const salePayments = paymentsBySaleId.get(sale.id) ?? [];

    if (sale.status === "completed") {
      report.completedSalesCount += 1;
      report.grossSalesTotal += sale.totalAmount;
      report.netSalesTotal += sale.totalAmount;
      report.subtotalTotal += sale.subtotal;
      report.taxCollectedTotal += sale.taxTotal;

      for (const payment of salePayments) {
        if (payment.provider === "cash") {
          report.cashTotal += payment.amount;
        } else {
          report.mobileMoneyTotal += payment.amount;
        }
      }
    }

    if (sale.status === "cancelled") {
      report.cancelledSalesCount += 1;
      report.cancelledTotal += sale.totalAmount;
      report.afterSaleTotal += sale.totalAmount;
      report.taxReversedTotal += sale.taxTotal;
    }

    if (sale.status === "refunded") {
      report.refundedSalesCount += 1;
      report.refundedTotal += sale.totalAmount;
      report.afterSaleTotal += sale.totalAmount;
      report.netSalesTotal -= sale.totalAmount;
      report.taxReversedTotal += sale.taxTotal;
    }

    if (sale.status === "cancelled" || sale.status === "refunded") {
      report.refundedPaymentTotal += salePayments.reduce(
        (total, payment) => total + payment.amount,
        0,
      );
    }
  }

  for (const cashSession of input.cashSessions) {
    const periodKey = getPeriodKey(cashSession.closedAt, input.periodType);
    const report = getOrCreateReport(reports, {
      periodType: input.periodType,
      periodKey,
      businessId: cashSession.businessId,
      storeId: cashSession.storeId,
    });

    report.cashDifferenceTotal += cashSession.differenceAmount;
  }

  return [...reports.values()].sort((first, second) =>
    second.periodKey.localeCompare(first.periodKey),
  );
}
