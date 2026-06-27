export type CashReportSessionInput = {
  id: string;
  businessId: string;
  storeId: string;
  openedAt: string;
  closedAt: string;
  openingBalance: number;
  expectedClosingBalance: number;
  closingBalance: number;
  differenceAmount: number;
  notes: string | null;
  openedByName: string | null;
  closedByName: string | null;
};

export type CashReportSaleInput = {
  id: string;
  storeId: string;
  createdAt: string;
  totalAmount: number;
};

export type CashReportPaymentInput = {
  saleId: string;
  provider: string;
  amount: number;
};

export type CashReportMovementInput = {
  id: string;
  cashSessionId: string;
  movementType: string;
  amount: number;
  reason: string;
  createdAt: string;
};

export type CashSessionReport = CashReportSessionInput & {
  salesCount: number;
  cashSalesTotal: number;
  mobileMoneyTotal: number;
  manualCashInTotal: number;
  manualCashOutTotal: number;
  grossSalesTotal: number;
  calculatedExpectedCash: number;
  movements: CashReportMovementInput[];
};

function isBetween(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

export function buildCashSessionReports(input: {
  sessions: CashReportSessionInput[];
  sales: CashReportSaleInput[];
  payments: CashReportPaymentInput[];
  movements: CashReportMovementInput[];
}) {
  const paymentsBySaleId = new Map<string, CashReportPaymentInput[]>();
  for (const payment of input.payments) {
    paymentsBySaleId.set(payment.saleId, [
      ...(paymentsBySaleId.get(payment.saleId) ?? []),
      payment,
    ]);
  }

  const movementsBySessionId = new Map<string, CashReportMovementInput[]>();
  for (const movement of input.movements) {
    movementsBySessionId.set(movement.cashSessionId, [
      ...(movementsBySessionId.get(movement.cashSessionId) ?? []),
      movement,
    ]);
  }

  return input.sessions.map((session) => {
    const sessionSales = input.sales.filter(
      (sale) =>
        sale.storeId === session.storeId &&
        isBetween(sale.createdAt, session.openedAt, session.closedAt),
    );
    const sessionSaleIds = new Set(sessionSales.map((sale) => sale.id));
    const sessionPayments = [...paymentsBySaleId.entries()]
      .filter(([saleId]) => sessionSaleIds.has(saleId))
      .flatMap(([, payments]) => payments);
    const sessionMovements = movementsBySessionId.get(session.id) ?? [];
    const cashSalesTotal = sessionPayments
      .filter((payment) => payment.provider === "cash")
      .reduce((total, payment) => total + payment.amount, 0);
    const mobileMoneyTotal = sessionPayments
      .filter((payment) => payment.provider !== "cash")
      .reduce((total, payment) => total + payment.amount, 0);
    const manualCashInTotal = sessionMovements
      .filter((movement) =>
        ["cash_in", "deposit"].includes(movement.movementType),
      )
      .reduce((total, movement) => total + movement.amount, 0);
    const manualCashOutTotal = sessionMovements
      .filter((movement) =>
        ["cash_out", "withdrawal"].includes(movement.movementType),
      )
      .reduce((total, movement) => total + movement.amount, 0);

    return {
      ...session,
      salesCount: sessionSales.length,
      cashSalesTotal,
      mobileMoneyTotal,
      manualCashInTotal,
      manualCashOutTotal,
      grossSalesTotal: sessionSales.reduce(
        (total, sale) => total + sale.totalAmount,
        0,
      ),
      calculatedExpectedCash:
        session.openingBalance +
        cashSalesTotal +
        manualCashInTotal -
        manualCashOutTotal,
      movements: sessionMovements.sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      ),
    } satisfies CashSessionReport;
  });
}
