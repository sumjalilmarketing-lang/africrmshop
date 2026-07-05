export type SuperAdminSubscriptionPlanInput = {
  id: string;
  isActive: boolean;
};

export type SuperAdminSubscriptionInput = {
  planId: string | null;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

export type SuperAdminSubscriptionsSummary = {
  planCount: number;
  activePlanCount: number;
  subscriptionCount: number;
  activeSubscriptionCount: number;
  trialingSubscriptionCount: number;
  pausedSubscriptionCount: number;
  orphanSubscriptionCount: number;
  endingSoonCount: number;
  monetizationScore: number;
};

function isEndingSoon(value: string | null, today: string) {
  if (!value) return false;

  const endTime = new Date(value).getTime();
  const todayTime = new Date(`${today}T00:00:00.000Z`).getTime();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  return endTime >= todayTime && endTime <= todayTime + fourteenDays;
}

export function buildSuperAdminSubscriptionsSummary(input: {
  plans: SuperAdminSubscriptionPlanInput[];
  subscriptions: SuperAdminSubscriptionInput[];
  today: string;
}): SuperAdminSubscriptionsSummary {
  const activePlanIds = new Set(
    input.plans.filter((plan) => plan.isActive).map((plan) => plan.id),
  );
  const planIds = new Set(input.plans.map((plan) => plan.id));
  const subscriptionCount = input.subscriptions.length;
  const activeSubscriptionCount = input.subscriptions.filter(
    (subscription) => subscription.status === "active",
  ).length;
  const trialingSubscriptionCount = input.subscriptions.filter(
    (subscription) => subscription.status === "trialing",
  ).length;
  const pausedSubscriptionCount = input.subscriptions.filter(
    (subscription) => subscription.status === "paused",
  ).length;
  const orphanSubscriptionCount = input.subscriptions.filter(
    (subscription) => !subscription.planId || !planIds.has(subscription.planId),
  ).length;
  const endingSoonCount = input.subscriptions.filter((subscription) =>
    isEndingSoon(
      subscription.status === "trialing"
        ? subscription.trialEndsAt
        : subscription.currentPeriodEnd,
      input.today,
    ),
  ).length;
  const monetizedSubscriptionCount = input.subscriptions.filter(
    (subscription) =>
      ["active", "trialing"].includes(subscription.status) &&
      subscription.planId !== null &&
      activePlanIds.has(subscription.planId),
  ).length;

  return {
    planCount: input.plans.length,
    activePlanCount: activePlanIds.size,
    subscriptionCount,
    activeSubscriptionCount,
    trialingSubscriptionCount,
    pausedSubscriptionCount,
    orphanSubscriptionCount,
    endingSoonCount,
    monetizationScore:
      subscriptionCount === 0
        ? 0
        : Math.round((monetizedSubscriptionCount / subscriptionCount) * 100),
  };
}
