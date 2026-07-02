export type OwnerCashControlReportInput = {
  differenceAmount: number;
  cashSalesTotal: number;
  mobileMoneyTotal: number;
  salesCount: number;
};

export type OwnerCashControlSummary = {
  reportCount: number;
  balancedReportCount: number;
  gapReportCount: number;
  totalCashSales: number;
  totalMobileMoney: number;
  netDifferenceAmount: number;
  absoluteDifferenceAmount: number;
  reconciliationRate: number;
  severity: "balanced" | "watch" | "critical";
};

export function buildOwnerCashControlSummary(
  reports: OwnerCashControlReportInput[],
): OwnerCashControlSummary {
  const reportCount = reports.length;
  const balancedReportCount = reports.filter(
    (report) => report.differenceAmount === 0,
  ).length;
  const gapReportCount = reportCount - balancedReportCount;
  const totalCashSales = reports.reduce(
    (total, report) => total + report.cashSalesTotal,
    0,
  );
  const totalMobileMoney = reports.reduce(
    (total, report) => total + report.mobileMoneyTotal,
    0,
  );
  const netDifferenceAmount = reports.reduce(
    (total, report) => total + report.differenceAmount,
    0,
  );
  const absoluteDifferenceAmount = reports.reduce(
    (total, report) => total + Math.abs(report.differenceAmount),
    0,
  );
  const reconciliationRate =
    reportCount === 0
      ? 100
      : Math.round((balancedReportCount / reportCount) * 100);
  const severity =
    gapReportCount === 0
      ? "balanced"
      : reconciliationRate >= 80 && absoluteDifferenceAmount <= 10_000
        ? "watch"
        : "critical";

  return {
    reportCount,
    balancedReportCount,
    gapReportCount,
    totalCashSales,
    totalMobileMoney,
    netDifferenceAmount,
    absoluteDifferenceAmount,
    reconciliationRate,
    severity,
  };
}
