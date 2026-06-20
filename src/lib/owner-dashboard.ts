import "server-only";

import type { AppSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getOwnerBusinesses(owner: AppSession) {
  const businessIds = [
    ...new Set([
      ...owner.ownerships.map((item) => item.businessId),
      ...owner.roles
        .filter((role) => role.roleCode === "owner" && role.businessId)
        .map((role) => role.businessId as string),
    ]),
  ];

  if (!businessIds.length) return [];

  const { data: businesses, error } = await supabaseAdmin
    .from("businesses")
    .select(
      "id, name, legal_name, slug, status, onboarding_status, activity_type_id, trial_ends_at, created_at",
    )
    .in("id", businessIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const activityIds = [
    ...new Set(
      (businesses ?? [])
        .map((business) => business.activity_type_id)
        .filter(Boolean),
    ),
  ] as string[];
  const activitiesResult = activityIds.length
    ? await supabaseAdmin
        .from("activity_types")
        .select("id, code, name, capabilities")
        .in("id", activityIds)
    : { data: [], error: null };
  if (activitiesResult.error) throw new Error(activitiesResult.error.message);
  const activities = new Map(
    (activitiesResult.data ?? []).map((activity) => [activity.id, activity]),
  );

  const [storesResult, employeesResult] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id, business_id")
      .in("business_id", businessIds)
      .is("deleted_at", null),
    supabaseAdmin
      .from("employees")
      .select("id, business_id")
      .in("business_id", businessIds)
      .eq("is_active", true)
      .is("deleted_at", null),
  ]);
  if (storesResult.error || employeesResult.error) {
    throw new Error(
      storesResult.error?.message ?? employeesResult.error?.message,
    );
  }

  return (businesses ?? []).map((business) => ({
    ...business,
    activity: business.activity_type_id
      ? (activities.get(business.activity_type_id) ?? null)
      : null,
    storeCount: (storesResult.data ?? []).filter(
      (store) => store.business_id === business.id,
    ).length,
    employeeCount: (employeesResult.data ?? []).filter(
      (employee) => employee.business_id === business.id,
    ).length,
  }));
}
