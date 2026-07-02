import { describe, expect, it } from "vitest";
import { buildSuperAdminPlatformSummary } from "@/lib/super-admin-platform-summary";

describe("buildSuperAdminPlatformSummary", () => {
  it("calcule la santé plateforme à partir des entreprises, utilisateurs et volumes", () => {
    const summary = buildSuperAdminPlatformSummary({
      businesses: [
        { status: "active" },
        { status: "active" },
        { status: "trial" },
        { status: "suspended" },
      ],
      users: [
        { status: "active" },
        { status: "inactive" },
        { status: "active" },
      ],
      financials: {
        monthlyRevenue: 100_000,
        collectedVolume: 80_000,
      },
    });

    expect(summary).toEqual({
      businessCount: 4,
      activeBusinessCount: 2,
      trialBusinessCount: 1,
      suspendedBusinessCount: 1,
      activeUserCount: 2,
      collectionRate: 80,
      healthScore: 59,
    });
  });

  it("retourne un score nul quand aucune entreprise n'est encore créée", () => {
    expect(
      buildSuperAdminPlatformSummary({
        businesses: [],
        users: [{ status: "active" }],
        financials: {
          monthlyRevenue: 0,
          collectedVolume: 0,
        },
      }),
    ).toEqual({
      businessCount: 0,
      activeBusinessCount: 0,
      trialBusinessCount: 0,
      suspendedBusinessCount: 0,
      activeUserCount: 1,
      collectionRate: 0,
      healthScore: 0,
    });
  });
});
