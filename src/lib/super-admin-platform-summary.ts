export type SuperAdminPlatformBusinessInput = {
  status: string;
};

export type SuperAdminPlatformUserInput = {
  status: string;
};

export type SuperAdminPlatformFinancialInput = {
  monthlyRevenue: number;
  collectedVolume: number;
};

export type SuperAdminPlatformSummary = {
  businessCount: number;
  activeBusinessCount: number;
  trialBusinessCount: number;
  suspendedBusinessCount: number;
  activeUserCount: number;
  collectionRate: number;
  healthScore: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildSuperAdminPlatformSummary(input: {
  businesses: SuperAdminPlatformBusinessInput[];
  users: SuperAdminPlatformUserInput[];
  financials: SuperAdminPlatformFinancialInput;
}): SuperAdminPlatformSummary {
  const businessCount = input.businesses.length;
  const activeBusinessCount = input.businesses.filter(
    (business) => business.status === "active",
  ).length;
  const trialBusinessCount = input.businesses.filter(
    (business) => business.status === "trial",
  ).length;
  const suspendedBusinessCount = input.businesses.filter(
    (business) => business.status === "suspended",
  ).length;
  const activeUserCount = input.users.filter(
    (user) => user.status === "active",
  ).length;
  const collectionRate =
    input.financials.monthlyRevenue > 0
      ? Math.round(
          (input.financials.collectedVolume / input.financials.monthlyRevenue) *
            100,
        )
      : 0;

  if (businessCount === 0) {
    return {
      businessCount,
      activeBusinessCount,
      trialBusinessCount,
      suspendedBusinessCount,
      activeUserCount,
      collectionRate,
      healthScore: 0,
    };
  }

  const activeRatio = activeBusinessCount / businessCount;
  const suspendedRatio = suspendedBusinessCount / businessCount;
  const userSignal = activeUserCount > 0 ? 20 : 0;
  const collectionSignal =
    input.financials.monthlyRevenue > 0
      ? Math.min(collectionRate, 100) * 0.2
      : 0;

  return {
    businessCount,
    activeBusinessCount,
    trialBusinessCount,
    suspendedBusinessCount,
    activeUserCount,
    collectionRate,
    healthScore: clampScore(
      activeRatio * 60 + userSignal + collectionSignal - suspendedRatio * 30,
    ),
  };
}
