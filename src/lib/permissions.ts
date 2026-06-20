export type PermissionContext = {
  businessId?: string;
  storeId?: string;
};

export type ScopedSession = {
  isSuperAdmin: boolean;
  isOwner: boolean;
  permissions: string[];
  permissionScopes: Array<{
    businessId: string | null;
    storeId: string | null;
    permissions: string[];
  }>;
  ownerships: Array<{ businessId: string }>;
};

export function hasPermission(
  session: ScopedSession,
  permission: string,
  context: PermissionContext = {},
) {
  if (session.isSuperAdmin) return true;

  if (
    session.isOwner &&
    context.businessId &&
    session.ownerships.some(
      (ownership) => ownership.businessId === context.businessId,
    )
  ) {
    return true;
  }

  if (!context.businessId && !context.storeId) {
    return session.permissions.includes(permission);
  }

  return session.permissionScopes.some(
    (scope) =>
      scope.permissions.includes(permission) &&
      (!context.businessId || scope.businessId === context.businessId) &&
      (!context.storeId ||
        scope.storeId === null ||
        scope.storeId === context.storeId),
  );
}
