import { describe, expect, it } from "vitest";
import { buildOwnerDashboardSummary } from "@/lib/owner-dashboard-summary";

describe("buildOwnerDashboardSummary", () => {
  it("builds consolidated owner dashboard metrics", () => {
    const summary = buildOwnerDashboardSummary({
      businesses: [
        { id: "business-1", storeCount: 2, employeeCount: 3 },
        { id: "business-2", storeCount: 1, employeeCount: 2 },
      ],
      sales: [
        {
          id: "sale-1",
          status: "completed",
          totalAmount: 25_000,
        },
        {
          id: "sale-2",
          status: "cancelled",
          totalAmount: 10_000,
        },
      ],
      payments: [
        {
          saleId: "sale-1",
          provider: "cash",
          amount: 15_000,
          status: "completed",
        },
        {
          saleId: "sale-1",
          provider: "wave",
          amount: 10_000,
          status: "completed",
        },
      ],
      expenses: [
        { status: "pending", totalAmount: 18_000 },
        { status: "rejected", totalAmount: 7_500 },
      ],
      products: [
        { id: "product-1", lowStockThreshold: 5 },
        { id: "product-2", lowStockThreshold: 0 },
        { id: "product-3", lowStockThreshold: 10 },
      ],
      stocks: [
        { productId: "product-1", quantity: 6, reservedQuantity: 2 },
        { productId: "product-3", quantity: 12, reservedQuantity: 0 },
      ],
      notifications: [
        { isRead: false, priority: "high" },
        { isRead: true, priority: "medium" },
      ],
    });

    expect(summary).toEqual({
      businessCount: 2,
      storeCount: 3,
      employeeCount: 5,
      todaySalesCount: 1,
      todaySalesTotal: 25_000,
      cashTodayTotal: 15_000,
      mobileMoneyTodayTotal: 10_000,
      pendingExpensesCount: 1,
      pendingExpensesTotal: 18_000,
      rejectedExpensesCount: 1,
      lowStockCount: 1,
      unreadNotificationsCount: 1,
      highPriorityNotificationsCount: 1,
    });
  });
});
