export type OwnerAccountingSummaryEntryInput = {
  sourceType: "sale" | "refund" | "expense";
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
};

export type OwnerAccountingSummary = {
  entryCount: number;
  saleEntryCount: number;
  refundEntryCount: number;
  expenseEntryCount: number;
  totalDebit: number;
  totalCredit: number;
  unbalancedEntryCount: number;
  balanceGapAmount: number;
  balancedRate: number;
};

export function buildOwnerAccountingSummary(
  entries: OwnerAccountingSummaryEntryInput[],
): OwnerAccountingSummary {
  const totalDebit = entries.reduce(
    (total, entry) => total + entry.totalDebit,
    0,
  );
  const totalCredit = entries.reduce(
    (total, entry) => total + entry.totalCredit,
    0,
  );
  const unbalancedEntryCount = entries.filter(
    (entry) => !entry.isBalanced,
  ).length;

  return {
    entryCount: entries.length,
    saleEntryCount: entries.filter((entry) => entry.sourceType === "sale")
      .length,
    refundEntryCount: entries.filter((entry) => entry.sourceType === "refund")
      .length,
    expenseEntryCount: entries.filter((entry) => entry.sourceType === "expense")
      .length,
    totalDebit,
    totalCredit,
    unbalancedEntryCount,
    balanceGapAmount: Math.abs(totalDebit - totalCredit),
    balancedRate:
      entries.length === 0
        ? 100
        : Math.round(
            ((entries.length - unbalancedEntryCount) / entries.length) * 100,
          ),
  };
}
