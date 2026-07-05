import { describe, expect, it } from "vitest";
import { buildSuperAdminSubscriptionsSummary } from "@/lib/super-admin-subscriptions-summary";

describe("buildSuperAdminSubscriptionsSummary", () => {
  it("calcule les indicateurs de supervision des abonnements", () => {
    const summary = buildSuperAdminSubscriptionsSummary({
      today: "2026-07-03",
      plans: [
        { id: "starter", isActive: true },
        { id: "business", isActive: true },
        { id: "legacy", isActive: false },
      ],
      subscriptions: [
        {
          planId: "starter",
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: "2026-07-15T00:00:00.000Z",
        },
        {
          planId: "business",
          status: "trialing",
          trialEndsAt: "2026-07-10T00:00:00.000Z",
          currentPeriodEnd: null,
        },
        {
          planId: "legacy",
          status: "paused",
          trialEndsAt: null,
          currentPeriodEnd: "2026-08-20T00:00:00.000Z",
        },
        {
          planId: null,
          status: "active",
          trialEndsAt: null,
          currentPeriodEnd: null,
        },
      ],
    });

    expect(summary).toEqual({
      planCount: 3,
      activePlanCount: 2,
      subscriptionCount: 4,
      activeSubscriptionCount: 2,
      trialingSubscriptionCount: 1,
      pausedSubscriptionCount: 1,
      orphanSubscriptionCount: 1,
      endingSoonCount: 2,
      monetizationScore: 50,
    });
  });

  it("retourne une synthèse vide sans abonnement", () => {
    expect(
      buildSuperAdminSubscriptionsSummary({
        today: "2026-07-03",
        plans: [],
        subscriptions: [],
      }),
    ).toEqual({
      planCount: 0,
      activePlanCount: 0,
      subscriptionCount: 0,
      activeSubscriptionCount: 0,
      trialingSubscriptionCount: 0,
      pausedSubscriptionCount: 0,
      orphanSubscriptionCount: 0,
      endingSoonCount: 0,
      monetizationScore: 0,
    });
  });
});
