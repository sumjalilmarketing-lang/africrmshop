import { describe, expect, it } from "vitest";
import { buildEmployeeDashboardSummary } from "@/lib/employee-dashboard-summary";

describe("buildEmployeeDashboardSummary", () => {
  it("calcule les accès et périmètres d'un employé", () => {
    const summary = buildEmployeeDashboardSummary({
      roles: [
        {
          roleCode: "cashier",
          businessId: "business-1",
          storeId: "store-1",
        },
      ],
      permissions: ["pos.access"],
      permissionScopes: [
        {
          businessId: "business-1",
          storeId: "store-1",
          permissions: ["pos.access", "inventory.manage"],
        },
      ],
    });

    expect(summary).toEqual({
      roleCount: 1,
      permissionCount: 2,
      businessScopeCount: 1,
      storeScopeCount: 1,
      canUsePos: true,
      canUseBookings: false,
      canViewAccounting: false,
      canManageInventory: true,
      accessScore: 100,
    });
  });

  it("signale un espace employé sans accès opérationnel", () => {
    expect(
      buildEmployeeDashboardSummary({
        roles: [],
        permissions: [],
        permissionScopes: [],
      }),
    ).toEqual({
      roleCount: 0,
      permissionCount: 0,
      businessScopeCount: 0,
      storeScopeCount: 0,
      canUsePos: false,
      canUseBookings: false,
      canViewAccounting: false,
      canManageInventory: false,
      accessScore: 0,
    });
  });
});
