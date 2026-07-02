export type OwnerSalesSummaryInput = {
  status: string;
  totalAmount: number;
  paidAmount: number;
  taxTotal: number;
};

export type OwnerSalesSummary = {
  saleCount: number;
  completedCount: number;
  cancelledCount: number;
  refundedCount: number;
  completedTotal: number;
  afterSaleTotal: number;
  taxTotal: number;
  averageBasket: number;
  paymentGapCount: number;
  paymentGapAmount: number;
  paymentControlRate: number;
};

export function buildOwnerSalesSummary(
  sales: OwnerSalesSummaryInput[],
): OwnerSalesSummary {
  const completedSales = sales.filter((sale) => sale.status === "completed");
  const cancelledSales = sales.filter((sale) => sale.status === "cancelled");
  const refundedSales = sales.filter((sale) => sale.status === "refunded");
  const completedTotal = completedSales.reduce(
    (total, sale) => total + sale.totalAmount,
    0,
  );
  const paymentGaps = completedSales
    .map((sale) => sale.paidAmount - sale.totalAmount)
    .filter((gap) => gap !== 0);
  const paymentGapAmount = paymentGaps.reduce(
    (total, gap) => total + Math.abs(gap),
    0,
  );

  return {
    saleCount: sales.length,
    completedCount: completedSales.length,
    cancelledCount: cancelledSales.length,
    refundedCount: refundedSales.length,
    completedTotal,
    afterSaleTotal: [...cancelledSales, ...refundedSales].reduce(
      (total, sale) => total + sale.totalAmount,
      0,
    ),
    taxTotal: completedSales.reduce((total, sale) => total + sale.taxTotal, 0),
    averageBasket:
      completedSales.length > 0 ? completedTotal / completedSales.length : 0,
    paymentGapCount: paymentGaps.length,
    paymentGapAmount,
    paymentControlRate:
      completedSales.length === 0
        ? 100
        : Math.round(
            ((completedSales.length - paymentGaps.length) /
              completedSales.length) *
              100,
          ),
  };
}
