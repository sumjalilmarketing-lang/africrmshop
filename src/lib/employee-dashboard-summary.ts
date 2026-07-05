export type EmployeeDashboardRoleInput = {
  roleCode: string;
  businessId: string | null;
  storeId: string | null;
};

export type EmployeeDashboardPermissionScopeInput = {
  businessId: string | null;
  storeId: string | null;
  permissions: string[];
};

export type EmployeeDashboardSummaryInput = {
  roles: EmployeeDashboardRoleInput[];
  permissions: string[];
  permissionScopes: EmployeeDashboardPermissionScopeInput[];
};

export type EmployeeDashboardSummary = {
  roleCount: number;
  permissionCount: number;
  businessScopeCount: number;
  storeScopeCount: number;
  canUsePos: boolean;
  canUseBookings: boolean;
  canViewAccounting: boolean;
  canManageInventory: boolean;
  accessScore: number;
};

function hasPermission(
  input: EmployeeDashboardSummaryInput,
  permission: string,
) {
  return (
    input.permissions.includes(permission) ||
    input.permissionScopes.some((scope) =>
      scope.permissions.includes(permission),
    )
  );
}

export function buildEmployeeDashboardSummary(
  input: EmployeeDashboardSummaryInput,
): EmployeeDashboardSummary {
  const businessIds = new Set(
    [
      ...input.roles.map((role) => role.businessId),
      ...input.permissionScopes.map((scope) => scope.businessId),
    ].filter((businessId): businessId is string => Boolean(businessId)),
  );
  const storeIds = new Set(
    [
      ...input.roles.map((role) => role.storeId),
      ...input.permissionScopes.map((scope) => scope.storeId),
    ].filter((storeId): storeId is string => Boolean(storeId)),
  );
  const permissionCodes = new Set([
    ...input.permissions,
    ...input.permissionScopes.flatMap((scope) => scope.permissions),
  ]);
  const canUsePos = hasPermission(input, "pos.access");
  const canUseBookings = hasPermission(input, "bookings.access");
  const canViewAccounting = hasPermission(input, "accounting.view");
  const canManageInventory =
    hasPermission(input, "inventory.manage") ||
    hasPermission(input, "stock.manage");
  const checks = [
    input.roles.length > 0,
    permissionCodes.size > 0,
    businessIds.size > 0,
    storeIds.size > 0,
    canUsePos || canUseBookings || canViewAccounting || canManageInventory,
  ];

  return {
    roleCount: input.roles.length,
    permissionCount: permissionCodes.size,
    businessScopeCount: businessIds.size,
    storeScopeCount: storeIds.size,
    canUsePos,
    canUseBookings,
    canViewAccounting,
    canManageInventory,
    accessScore: Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    ),
  };
}
