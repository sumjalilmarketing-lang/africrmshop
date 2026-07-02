export type OwnerTaxSummaryRowInput = {
  completedSalesCount: number;
  afterSaleCount: number;
  deductibleExpenseCount: number;
  taxableSalesTotal: number;
  outputTaxTotal: number;
  reversedOutputTaxTotal: number;
  deductibleExpenseTotal: number;
  inputTaxTotal: number;
  netTaxDue: number;
};

export type OwnerTaxSummary = {
  rowCount: number;
  completedSalesCount: number;
  afterSaleCount: number;
  deductibleExpenseCount: number;
  taxableSalesTotal: number;
  outputTaxTotal: number;
  reversedOutputTaxTotal: number;
  deductibleExpenseTotal: number;
  inputTaxTotal: number;
  netTaxDue: number;
  netCollectedTax: number;
  effectiveTaxRate: number;
  deductibleCoverageRate: number;
};

function rate(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function buildOwnerTaxSummary(
  rows: OwnerTaxSummaryRowInput[],
): OwnerTaxSummary {
  const summary = rows.reduce<OwnerTaxSummaryRowInput & { rowCount: number }>(
    (accumulator, row) => ({
      rowCount: accumulator.rowCount + 1,
      completedSalesCount:
        accumulator.completedSalesCount + row.completedSalesCount,
      afterSaleCount: accumulator.afterSaleCount + row.afterSaleCount,
      deductibleExpenseCount:
        accumulator.deductibleExpenseCount + row.deductibleExpenseCount,
      taxableSalesTotal: accumulator.taxableSalesTotal + row.taxableSalesTotal,
      outputTaxTotal: accumulator.outputTaxTotal + row.outputTaxTotal,
      reversedOutputTaxTotal:
        accumulator.reversedOutputTaxTotal + row.reversedOutputTaxTotal,
      deductibleExpenseTotal:
        accumulator.deductibleExpenseTotal + row.deductibleExpenseTotal,
      inputTaxTotal: accumulator.inputTaxTotal + row.inputTaxTotal,
      netTaxDue: accumulator.netTaxDue + row.netTaxDue,
    }),
    {
      rowCount: 0,
      completedSalesCount: 0,
      afterSaleCount: 0,
      deductibleExpenseCount: 0,
      taxableSalesTotal: 0,
      outputTaxTotal: 0,
      reversedOutputTaxTotal: 0,
      deductibleExpenseTotal: 0,
      inputTaxTotal: 0,
      netTaxDue: 0,
    },
  );
  const netCollectedTax =
    summary.outputTaxTotal - summary.reversedOutputTaxTotal;

  return {
    ...summary,
    netCollectedTax,
    effectiveTaxRate: rate(netCollectedTax, summary.taxableSalesTotal),
    deductibleCoverageRate: rate(summary.inputTaxTotal, netCollectedTax),
  };
}
