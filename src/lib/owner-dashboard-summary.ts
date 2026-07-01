export type DashboardBusinessInput = {
  id: string;
  storeCount: number;
  employeeCount: number;
};

export type DashboardSaleInput = {
  id: string;
  status: string;
  totalAmount: number;
};

export type DashboardPaymentInput = {
  saleId: string;
  provider: string;
  amount: number;
  status: string;
};

export type DashboardExpenseInput = {
  status: string;
  totalAmount: number;
};

export type DashboardProductInput = {
  id: string;
  lowStockThreshold: number;
};

export type DashboardStockInput = {
  productId: string;
  quantity: number;
  reservedQuantity: number;
};

export type DashboardNotificationInput = {
  isRead: boolean;
  priority: "low" | "medium" | "high";
};

export type OwnerDashboardSummary = {
  businessCount: number;
  storeCount: number;
  employeeCount: number;
  todaySalesCount: number;
  todaySalesTotal: number;
  cashTodayTotal: number;
  mobileMoneyTodayTotal: number;
  pendingExpensesCount: number;
  pendingExpensesTotal: number;
  rejectedExpensesCount: number;
  lowStockCount: number;
  unreadNotificationsCount: number;
  highPriorityNotificationsCount: number;
};

export function buildOwnerDashboardSummary(input: {
  businesses: DashboardBusinessInput[];
  sales: DashboardSaleInput[];
  payments: DashboardPaymentInput[];
  expenses: DashboardExpenseInput[];
  products: DashboardProductInput[];
  stocks: DashboardStockInput[];
  notifications: DashboardNotificationInput[];
}): OwnerDashboardSummary {
  const completedSales = input.sales.filter(
    (sale) => sale.status === "completed",
  );
  const productThresholds = new Map(
    input.products.map((product) => [product.id, product.lowStockThreshold]),
  );
  const availableStockByProductId = new Map<string, number>();

  for (const stock of input.stocks) {
    availableStockByProductId.set(
      stock.productId,
      (availableStockByProductId.get(stock.productId) ?? 0) +
        Math.max(0, stock.quantity - stock.reservedQuantity),
    );
  }

  const lowStockCount = input.products.filter((product) => {
    const threshold = productThresholds.get(product.id) ?? 0;
    if (threshold <= 0) return false;

    return (availableStockByProductId.get(product.id) ?? 0) <= threshold;
  }).length;

  return {
    businessCount: input.businesses.length,
    storeCount: input.businesses.reduce(
      (total, business) => total + business.storeCount,
      0,
    ),
    employeeCount: input.businesses.reduce(
      (total, business) => total + business.employeeCount,
      0,
    ),
    todaySalesCount: completedSales.length,
    todaySalesTotal: completedSales.reduce(
      (total, sale) => total + sale.totalAmount,
      0,
    ),
    cashTodayTotal: input.payments
      .filter((payment) => payment.status === "completed")
      .filter((payment) => payment.provider === "cash")
      .reduce((total, payment) => total + payment.amount, 0),
    mobileMoneyTodayTotal: input.payments
      .filter((payment) => payment.status === "completed")
      .filter((payment) => payment.provider !== "cash")
      .reduce((total, payment) => total + payment.amount, 0),
    pendingExpensesCount: input.expenses.filter(
      (expense) => expense.status === "pending",
    ).length,
    pendingExpensesTotal: input.expenses
      .filter((expense) => expense.status === "pending")
      .reduce((total, expense) => total + expense.totalAmount, 0),
    rejectedExpensesCount: input.expenses.filter(
      (expense) => expense.status === "rejected",
    ).length,
    lowStockCount,
    unreadNotificationsCount: input.notifications.filter(
      (notification) => !notification.isRead,
    ).length,
    highPriorityNotificationsCount: input.notifications.filter(
      (notification) => notification.priority === "high",
    ).length,
  };
}
