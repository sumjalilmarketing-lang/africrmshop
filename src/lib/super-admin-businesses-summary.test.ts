import { describe, expect, it } from "vitest";
import { buildSuperAdminBusinessesSummary } from "@/lib/super-admin-businesses-summary";

describe("buildSuperAdminBusinessesSummary", () => {
  it("calcule les indicateurs de supervision des entreprises", () => {
    const summary = buildSuperAdminBusinessesSummary([
      {
        status: "active",
        onboardingStatus: "completed",
        activityTypeId: "activity-shop",
        storeCount: 2,
      },
      {
        status: "trial",
        onboardingStatus: "business_created",
        activityTypeId: null,
        storeCount: 0,
      },
      {
        status: "suspended",
        onboardingStatus: "completed",
        activityTypeId: "activity-service",
        storeCount: 1,
      },
      {
        status: "inactive",
        onboardingStatus: null,
        activityTypeId: "activity-restaurant",
        storeCount: 0,
      },
    ]);

    expect(summary).toEqual({
      businessCount: 4,
      activeBusinessCount: 1,
      trialBusinessCount: 1,
      suspendedBusinessCount: 1,
      inactiveBusinessCount: 1,
      storeCount: 3,
      storelessBusinessCount: 2,
      missingActivityCount: 1,
      onboardingIncompleteCount: 1,
      readinessScore: 25,
    });
  });

  it("retourne une synthèse vide quand aucune entreprise n'existe", () => {
    expect(buildSuperAdminBusinessesSummary([])).toEqual({
      businessCount: 0,
      activeBusinessCount: 0,
      trialBusinessCount: 0,
      suspendedBusinessCount: 0,
      inactiveBusinessCount: 0,
      storeCount: 0,
      storelessBusinessCount: 0,
      missingActivityCount: 0,
      onboardingIncompleteCount: 0,
      readinessScore: 0,
    });
  });
});
