import type { CreateBusinessInput } from "@/lib/validation/business";

export type BusinessCreationCatalogItem = {
  code: string;
  name: string;
};

export type BusinessCreationSummary = {
  activityCount: number;
  planCount: number;
  selectedActivityLabel: string;
  selectedPlanLabel: string;
  hasBusinessIdentity: boolean;
  hasOwnerIdentity: boolean;
  hasCatalogSelection: boolean;
  canPrepareCreation: boolean;
  readinessScore: number;
};

function hasUsefulText(value: unknown, minLength = 2) {
  return typeof value === "string" && value.trim().length >= minLength;
}

export function buildSuperAdminBusinessCreationSummary(input: {
  activities: BusinessCreationCatalogItem[];
  plans: BusinessCreationCatalogItem[];
  draft: Partial<CreateBusinessInput>;
}): BusinessCreationSummary {
  const selectedActivity = input.activities.find(
    (activity) => activity.code === input.draft.activityTypeCode,
  );
  const selectedPlan = input.plans.find(
    (plan) => plan.code === input.draft.plan,
  );
  const hasBusinessIdentity =
    hasUsefulText(input.draft.name) && hasUsefulText(input.draft.sector);
  const hasOwnerIdentity =
    hasUsefulText(input.draft.ownerFirstName) &&
    hasUsefulText(input.draft.ownerLastName) &&
    typeof input.draft.ownerEmail === "string" &&
    input.draft.ownerEmail.includes("@");
  const hasCatalogSelection = Boolean(selectedActivity && selectedPlan);
  const checks = [
    input.activities.length > 0,
    input.plans.length > 0,
    hasBusinessIdentity,
    hasOwnerIdentity,
    hasCatalogSelection,
  ];
  const passedChecks = checks.filter(Boolean).length;

  return {
    activityCount: input.activities.length,
    planCount: input.plans.length,
    selectedActivityLabel:
      selectedActivity?.name ?? "Activité non sélectionnée",
    selectedPlanLabel: selectedPlan?.name ?? "Offre non sélectionnée",
    hasBusinessIdentity,
    hasOwnerIdentity,
    hasCatalogSelection,
    canPrepareCreation:
      input.activities.length > 0 &&
      input.plans.length > 0 &&
      hasBusinessIdentity &&
      hasOwnerIdentity &&
      hasCatalogSelection,
    readinessScore: Math.round((passedChecks / checks.length) * 100),
  };
}
