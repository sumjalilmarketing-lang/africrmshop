export type OwnerExpenseSummaryInput = {
  status: string;
  taxAmount: number;
  totalAmount: number;
  documentCount: number;
};

export type OwnerExpensesSummary = {
  expenseCount: number;
  totalExpenses: number;
  totalTax: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
  missingDocumentCount: number;
  documentComplianceRate: number;
  approvalRate: number;
};

export function buildOwnerExpensesSummary(
  expenses: OwnerExpenseSummaryInput[],
): OwnerExpensesSummary {
  const draftCount = expenses.filter(
    (expense) => expense.status === "draft",
  ).length;
  const pendingCount = expenses.filter(
    (expense) => expense.status === "pending",
  ).length;
  const approvedCount = expenses.filter(
    (expense) => expense.status === "approved",
  ).length;
  const paidCount = expenses.filter(
    (expense) => expense.status === "paid",
  ).length;
  const rejectedCount = expenses.filter(
    (expense) => expense.status === "rejected",
  ).length;
  const missingDocumentCount = expenses.filter(
    (expense) => expense.documentCount === 0,
  ).length;
  const controlledExpenseCount = approvedCount + paidCount + rejectedCount;

  return {
    expenseCount: expenses.length,
    totalExpenses: expenses.reduce(
      (total, expense) => total + expense.totalAmount,
      0,
    ),
    totalTax: expenses.reduce((total, expense) => total + expense.taxAmount, 0),
    draftCount,
    pendingCount,
    approvedCount,
    paidCount,
    rejectedCount,
    missingDocumentCount,
    documentComplianceRate:
      expenses.length === 0
        ? 100
        : Math.round(
            ((expenses.length - missingDocumentCount) / expenses.length) * 100,
          ),
    approvalRate:
      expenses.length === 0
        ? 100
        : Math.round((controlledExpenseCount / expenses.length) * 100),
  };
}
