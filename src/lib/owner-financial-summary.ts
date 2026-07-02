export type OwnerFinancialSummaryRowInput = {
  completedSalesCount: number;
  cancelledSalesCount: number;
  refundedSalesCount: number;
  grossSalesTotal: number;
  afterSaleTotal: number;
  netSalesTotal: number;
  taxCollectedTotal: number;
  taxReversedTotal: number;
  cashTotal: number;
  mobileMoneyTotal: number;
  refundedPaymentTotal: number;
  cashDifferenceTotal: number;
};

export type OwnerFinancialSummary = {
  rowCount: number;
  completedSalesCount: number;
  cancelledSalesCount: number;
  refundedSalesCount: number;
  grossSalesTotal: number;
  afterSaleTotal: number;
  netSalesTotal: number;
  taxCollectedTotal: number;
  taxReversedTotal: number;
  cashTotal: number;
  mobileMoneyTotal: number;
  refundedPaymentTotal: number;
  cashDifferenceTotal: number;
  afterSaleRate: number;
  mobileMoneyShareRate: number;
  cashDifferenceRate: number;
};

function rate(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function buildOwnerFinancialSummary(
  rows: OwnerFinancialSummaryRowInput[],
): OwnerFinancialSummary {
  const summary = rows.reduce<
    OwnerFinancialSummaryRowInput & { rowCount: number }
  >(
    (accumulator, row) => ({
      rowCount: accumulator.rowCount + 1,
      completedSalesCount:
        accumulator.completedSalesCount + row.completedSalesCount,
      cancelledSalesCount:
        accumulator.cancelledSalesCount + row.cancelledSalesCount,
      refundedSalesCount:
        accumulator.refundedSalesCount + row.refundedSalesCount,
      grossSalesTotal: accumulator.grossSalesTotal + row.grossSalesTotal,
      afterSaleTotal: accumulator.afterSaleTotal + row.afterSaleTotal,
      netSalesTotal: accumulator.netSalesTotal + row.netSalesTotal,
      taxCollectedTotal: accumulator.taxCollectedTotal + row.taxCollectedTotal,
      taxReversedTotal: accumulator.taxReversedTotal + row.taxReversedTotal,
      cashTotal: accumulator.cashTotal + row.cashTotal,
      mobileMoneyTotal: accumulator.mobileMoneyTotal + row.mobileMoneyTotal,
      refundedPaymentTotal:
        accumulator.refundedPaymentTotal + row.refundedPaymentTotal,
      cashDifferenceTotal:
        accumulator.cashDifferenceTotal + row.cashDifferenceTotal,
    }),
    {
      rowCount: 0,
      completedSalesCount: 0,
      cancelledSalesCount: 0,
      refundedSalesCount: 0,
      grossSalesTotal: 0,
      afterSaleTotal: 0,
      netSalesTotal: 0,
      taxCollectedTotal: 0,
      taxReversedTotal: 0,
      cashTotal: 0,
      mobileMoneyTotal: 0,
      refundedPaymentTotal: 0,
      cashDifferenceTotal: 0,
    },
  );
  const paymentTotal = summary.cashTotal + summary.mobileMoneyTotal;

  return {
    ...summary,
    afterSaleRate: rate(summary.afterSaleTotal, summary.grossSalesTotal),
    mobileMoneyShareRate: rate(summary.mobileMoneyTotal, paymentTotal),
    cashDifferenceRate: rate(
      Math.abs(summary.cashDifferenceTotal),
      summary.cashTotal,
    ),
  };
}
