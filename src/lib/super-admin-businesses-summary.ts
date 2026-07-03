export type SuperAdminBusinessSummaryInput = {
  status: string;
  onboardingStatus: string | null;
  activityTypeId: string | null;
  storeCount: number;
};

export type SuperAdminBusinessesSummary = {
  businessCount: number;
  activeBusinessCount: number;
  trialBusinessCount: number;
  suspendedBusinessCount: number;
  inactiveBusinessCount: number;
  storeCount: number;
  storelessBusinessCount: number;
  missingActivityCount: number;
  onboardingIncompleteCount: number;
  readinessScore: number;
};

export function buildSuperAdminBusinessesSummary(
  businesses: SuperAdminBusinessSummaryInput[],
): SuperAdminBusinessesSummary {
  const businessCount = businesses.length;
  const activeBusinessCount = businesses.filter(
    (business) => business.status === "active",
  ).length;
  const trialBusinessCount = businesses.filter(
    (business) => business.status === "trial",
  ).length;
  const suspendedBusinessCount = businesses.filter(
    (business) => business.status === "suspended",
  ).length;
  const inactiveBusinessCount = businesses.filter(
    (business) => business.status === "inactive",
  ).length;
  const storeCount = businesses.reduce(
    (total, business) => total + business.storeCount,
    0,
  );
  const storelessBusinessCount = businesses.filter(
    (business) => business.storeCount === 0,
  ).length;
  const missingActivityCount = businesses.filter(
    (business) => !business.activityTypeId,
  ).length;
  const onboardingIncompleteCount = businesses.filter(
    (business) =>
      business.onboardingStatus !== null &&
      business.onboardingStatus !== "completed",
  ).length;
  const readyBusinessCount = businesses.filter(
    (business) =>
      ["active", "trial"].includes(business.status) &&
      business.storeCount > 0 &&
      Boolean(business.activityTypeId) &&
      (business.onboardingStatus === null ||
        business.onboardingStatus === "completed"),
  ).length;

  return {
    businessCount,
    activeBusinessCount,
    trialBusinessCount,
    suspendedBusinessCount,
    inactiveBusinessCount,
    storeCount,
    storelessBusinessCount,
    missingActivityCount,
    onboardingIncompleteCount,
    readinessScore:
      businessCount === 0
        ? 0
        : Math.round((readyBusinessCount / businessCount) * 100),
  };
}
