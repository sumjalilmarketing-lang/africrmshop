import { describe, expect, it } from "vitest";
import { buildOwnerSettingsSummary } from "@/lib/owner-settings-summary";

describe("buildOwnerSettingsSummary", () => {
  it("calcule la préparation opérationnelle du compte owner", () => {
    const summary = buildOwnerSettingsSummary({
      today: "2026-07-02",
      businesses: [
        {
          status: "active",
          onboarding_status: "completed",
          trial_ends_at: "2026-07-10T00:00:00.000Z",
          storeCount: 2,
          employeeCount: 3,
        },
        {
          status: "suspended",
          onboarding_status: "business_created",
          trial_ends_at: "2026-08-15T00:00:00.000Z",
          storeCount: 0,
          employeeCount: 1,
        },
      ],
    });

    expect(summary).toEqual({
      businessCount: 2,
      activeBusinessCount: 1,
      storeCount: 2,
      employeeCount: 4,
      onboardingIncompleteCount: 1,
      trialEndingSoonCount: 1,
      operationalScore: 80,
    });
  });

  it("retourne un score nul quand le compte n'a pas encore d'entreprise", () => {
    expect(
      buildOwnerSettingsSummary({
        today: "2026-07-02",
        businesses: [],
      }),
    ).toEqual({
      businessCount: 0,
      activeBusinessCount: 0,
      storeCount: 0,
      employeeCount: 0,
      onboardingIncompleteCount: 0,
      trialEndingSoonCount: 0,
      operationalScore: 0,
    });
  });
});
