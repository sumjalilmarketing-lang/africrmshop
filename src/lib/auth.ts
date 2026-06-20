import "server-only";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const AUTH_COOKIE_NAME = "africrm_access_token";

export type RoleAssignment = {
  roleId: string;
  roleCode: string;
  roleName: string;
  businessId: string | null;
  storeId: string | null;
};

export type BusinessOwnership = {
  businessId: string;
  isPrimary: boolean;
};

export type PermissionScope = {
  businessId: string | null;
  storeId: string | null;
  permissions: string[];
};

export type AppSession = {
  authUserId: string;
  profileId: string;
  email: string | null;
  displayName: string;
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  roles: RoleAssignment[];
  permissions: string[];
  permissionScopes: PermissionScope[];
  ownerships: BusinessOwnership[];
  defaultRoute: string;
};

export type SuperAdminSession = AppSession;

function getDefaultRoute(session: {
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isEmployee: boolean;
}) {
  if (session.mustChangePassword) return "/changer-mot-de-passe";
  if (session.isSuperAdmin) return "/super-admin";
  if (session.isOwner) return "/owner/dashboard";
  if (session.isEmployee) return "/employee/dashboard";
  return "/connexion?error=access-denied";
}

export async function getAppSessionFromAccessToken(
  accessToken: string,
): Promise<AppSession | null> {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !authUser) return null;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id, display_name, first_name, last_name, email, status, metadata")
    .eq("auth_user_id", authUser.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "active") return null;

  const [assignmentsResult, ownershipsResult] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("role_id, business_id, store_id")
      .eq("user_id", profile.id),
    supabaseAdmin
      .from("business_owners")
      .select("business_id, is_primary")
      .eq("user_id", profile.id)
      .eq("status", "active"),
  ]);

  if (assignmentsResult.error || ownershipsResult.error) return null;

  const rawAssignments = assignmentsResult.data ?? [];
  const roleIds = [...new Set(rawAssignments.map((item) => item.role_id))];
  const rolesResult = roleIds.length
    ? await supabaseAdmin
        .from("roles")
        .select("id, code, name")
        .in("id", roleIds)
    : { data: [], error: null };

  if (rolesResult.error) return null;

  const rolesById = new Map(
    (rolesResult.data ?? []).map((role) => [role.id, role]),
  );
  const roles = rawAssignments.flatMap((assignment) => {
    const role = rolesById.get(assignment.role_id);
    return role
      ? [
          {
            roleId: role.id,
            roleCode: role.code,
            roleName: role.name,
            businessId: assignment.business_id,
            storeId: assignment.store_id,
          },
        ]
      : [];
  });

  const permissionResult = roleIds.length
    ? await supabaseAdmin
        .from("role_permissions")
        .select("role_id, permission_id")
        .in("role_id", roleIds)
    : { data: [], error: null };

  if (permissionResult.error) return null;

  const permissionIds = [
    ...new Set((permissionResult.data ?? []).map((item) => item.permission_id)),
  ];
  const permissionsResult = permissionIds.length
    ? await supabaseAdmin
        .from("permissions")
        .select("id, code")
        .in("id", permissionIds)
    : { data: [], error: null };

  if (permissionsResult.error) return null;

  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const permissionCodesById = new Map(
    (permissionsResult.data ?? []).map((permission) => [
      permission.id,
      permission.code,
    ]),
  );
  const permissionCodesByRole = new Map<string, string[]>();
  for (const mapping of permissionResult.data ?? []) {
    const permissionCode = permissionCodesById.get(mapping.permission_id);
    if (!permissionCode) continue;
    const rolePermissions = permissionCodesByRole.get(mapping.role_id) ?? [];
    rolePermissions.push(permissionCode);
    permissionCodesByRole.set(mapping.role_id, rolePermissions);
  }
  const permissionScopes = roles.map((role) => ({
    businessId: role.businessId,
    storeId: role.storeId,
    permissions: permissionCodesByRole.get(role.roleId) ?? [],
  }));
  const ownerships = (ownershipsResult.data ?? []).map((ownership) => ({
    businessId: ownership.business_id,
    isPrimary: ownership.is_primary,
  }));
  const roleCodes = new Set(roles.map((role) => role.roleCode));
  const accountType = metadata.account_type;
  const mustChangePassword = metadata.must_change_password === true;
  const isSuperAdmin = roleCodes.has("super_admin");
  const isOwner =
    roleCodes.has("owner") ||
    ownerships.length > 0 ||
    accountType === "owner" ||
    accountType === "business_owner";
  const isEmployee = roles.some(
    (role) => !["super_admin", "owner"].includes(role.roleCode),
  );
  const fullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ");
  const sessionBase = {
    mustChangePassword,
    isSuperAdmin,
    isOwner,
    isEmployee,
  };

  return {
    authUserId: authUser.id,
    profileId: profile.id,
    email: profile.email ?? authUser.email ?? null,
    displayName: profile.display_name || fullName || "Utilisateur AFRICRM",
    ...sessionBase,
    roles,
    permissions: [...new Set(permissionCodesById.values())],
    permissionScopes,
    ownerships,
    defaultRoute: getDefaultRoute(sessionBase),
  };
}

export async function getAppSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return accessToken ? getAppSessionFromAccessToken(accessToken) : null;
}

export async function getSuperAdminFromAccessToken(accessToken: string) {
  const session = await getAppSessionFromAccessToken(accessToken);
  return session?.isSuperAdmin ? session : null;
}

export async function getSuperAdminSession() {
  const session = await getAppSession();
  return session?.isSuperAdmin ? session : null;
}

export async function getOwnerSession() {
  const session = await getAppSession();
  return session?.isOwner ? session : null;
}

export async function getEmployeeSession() {
  const session = await getAppSession();
  return session?.isEmployee ? session : null;
}
