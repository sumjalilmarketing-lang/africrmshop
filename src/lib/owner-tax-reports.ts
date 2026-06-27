export type TaxSaleStatus = "completed" | "cancelled" | "refunded";

export type TaxSaleInput = {
  id: string;
  businessId: string;
  storeId: string;
  status: TaxSaleStatus | string;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  createdAt: string;
};

export type TaxExpenseInput = {
  id: string;
  businessId: string;
  storeId: string | null;
  status: string;
  amountExcludingTax: number;
  taxAmount: number;
  totalAmount: number;
  expenseDate: string;
};

export type TaxReportPeriod = "month" | "quarter";

export type TaxReportRow = {
  periodType: TaxReportPeriod;
  periodKey: string;
  businessId: string;
  storeId: string | null;
  completedSalesCount: number;
  afterSaleCount: number;
  deductibleExpenseCount: number;
  taxableSalesTotal: number;
  outputTaxTotal: number;
  reversedSalesTotal: number;
  reversedOutputTaxTotal: number;
  deductibleExpenseTotal: number;
  inputTaxTotal: number;
  netTaxDue: number;
};

function createEmptyReport(input: {
  periodType: TaxReportPeriod;
  periodKey: string;
  businessId: string;
  storeId: string | null;
}): TaxReportRow {
  return {
    ...input,
    completedSalesCount: 0,
    afterSaleCount: 0,
    deductibleExpenseCount: 0,
    taxableSalesTotal: 0,
    outputTaxTotal: 0,
    reversedSalesTotal: 0,
    reversedOutputTaxTotal: 0,
    deductibleExpenseTotal: 0,
    inputTaxTotal: 0,
    netTaxDue: 0,
  };
}

function getQuarterKey(value: string) {
  const month = Number(value.slice(5, 7));
  const quarter = Math.max(1, Math.ceil(month / 3));

  return `${value.slice(0, 4)}-Q${quarter}`;
}

function getPeriodKey(value: string, periodType: TaxReportPeriod) {
  return periodType === "quarter" ? getQuarterKey(value) : value.slice(0, 7);
}

function getReportKey(input: {
  periodType: TaxReportPeriod;
  periodKey: string;
  businessId: string;
  storeId: string | null;
}) {
  return [
    input.periodType,
    input.periodKey,
    input.businessId,
    input.storeId ?? "none",
  ].join(":");
}

function getOrCreateReport(
  reports: Map<string, TaxReportRow>,
  input: {
    periodType: TaxReportPeriod;
    periodKey: string;
    businessId: string;
    storeId: string | null;
  },
) {
  const key = getReportKey(input);
  const existingReport = reports.get(key);
  if (existingReport) return existingReport;

  const report = createEmptyReport(input);
  reports.set(key, report);

  return report;
}

function isDeductibleExpense(status: string) {
  return status === "approved" || status === "paid";
}

function finalizeReport(report: TaxReportRow) {
  report.netTaxDue =
    report.outputTaxTotal -
    report.reversedOutputTaxTotal -
    report.inputTaxTotal;

  return report;
}

export function buildOwnerTaxReportRows(input: {
  sales: TaxSaleInput[];
  expenses: TaxExpenseInput[];
  periodType: TaxReportPeriod;
}) {
  const reports = new Map<string, TaxReportRow>();

  for (const sale of input.sales) {
    const periodKey = getPeriodKey(sale.createdAt, input.periodType);
    const report = getOrCreateReport(reports, {
      periodType: input.periodType,
      periodKey,
      businessId: sale.businessId,
      storeId: sale.storeId,
    });

    if (sale.status === "completed") {
      report.completedSalesCount += 1;
      report.taxableSalesTotal += sale.subtotal;
      report.outputTaxTotal += sale.taxTotal;
    }

    if (sale.status === "cancelled" || sale.status === "refunded") {
      report.afterSaleCount += 1;
      report.reversedSalesTotal += sale.subtotal;
      report.reversedOutputTaxTotal += sale.taxTotal;
    }
  }

  for (const expense of input.expenses) {
    if (!isDeductibleExpense(expense.status)) continue;

    const periodKey = getPeriodKey(expense.expenseDate, input.periodType);
    const report = getOrCreateReport(reports, {
      periodType: input.periodType,
      periodKey,
      businessId: expense.businessId,
      storeId: expense.storeId,
    });

    report.deductibleExpenseCount += 1;
    report.deductibleExpenseTotal += expense.amountExcludingTax;
    report.inputTaxTotal += expense.taxAmount;
  }

  return [...reports.values()]
    .map(finalizeReport)
    .sort((first, second) => second.periodKey.localeCompare(first.periodKey));
}
