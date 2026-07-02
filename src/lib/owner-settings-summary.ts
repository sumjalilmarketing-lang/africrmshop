export type OwnerSettingsBusinessInput = {
  status: string;
  onboarding_status: string | null;
  trial_ends_at: string | null;
  storeCount: number;
  employeeCount: number;
};

export type OwnerSettingsSummary = {
  businessCount: number;
  activeBusinessCount: number;
  storeCount: number;
  employeeCount: number;
  onboardingIncompleteCount: number;
  trialEndingSoonCount: number;
  operationalScore: number;
};

function isTrialEndingSoon(trialEndsAt: string | null, today: string) {
  if (!trialEndsAt) return false;

  const trialTime = new Date(trialEndsAt).getTime();
  const todayTime = new Date(`${today}T00:00:00.000Z`).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  return trialTime >= todayTime && trialTime <= todayTime + fourteenDays;
}

export function buildOwnerSettingsSummary(input: {
  businesses: OwnerSettingsBusinessInput[];
  today: string;
}): OwnerSettingsSummary {
  const businessCount = input.businesses.length;
  const activeBusinessCount = input.businesses.filter(
    (business) => business.status === "active",
  ).length;
  const storeCount = input.businesses.reduce(
    (total, business) => total + business.storeCount,
    0,
  );
  const employeeCount = input.businesses.reduce(
    (total, business) => total + business.employeeCount,
    0,
  );
  const onboardingIncompleteCount = input.businesses.filter(
    (business) =>
      business.onboarding_status !== null &&
      business.onboarding_status !== "completed",
  ).length;
  const trialEndingSoonCount = input.businesses.filter((business) =>
    isTrialEndingSoon(business.trial_ends_at, input.today),
  ).length;

  const readinessChecks = [
    businessCount > 0,
    activeBusinessCount > 0,
    storeCount > 0,
    employeeCount > 0,
    onboardingIncompleteCount === 0,
  ];
  const passedChecks = readinessChecks.filter(Boolean).length;

  return {
    businessCount,
    activeBusinessCount,
    storeCount,
    employeeCount,
    onboardingIncompleteCount,
    trialEndingSoonCount,
    operationalScore:
      businessCount === 0
        ? 0
        : Math.round((passedChecks / readinessChecks.length) * 100),
  };
}
