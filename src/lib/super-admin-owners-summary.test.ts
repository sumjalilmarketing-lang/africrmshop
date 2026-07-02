import { describe, expect, it } from "vitest";
import { buildSuperAdminOwnersSummary } from "@/lib/super-admin-owners-summary";

describe("buildSuperAdminOwnersSummary", () => {
  it("calcule les indicateurs de contrôle des propriétaires", () => {
    const summary = buildSuperAdminOwnersSummary([
      {
        status: "active",
        isPrimary: true,
        userStatus: "active",
        businessExists: true,
      },
      {
        status: "active",
        isPrimary: false,
        userStatus: "suspended",
        businessExists: true,
      },
      {
        status: "revoked",
        isPrimary: false,
        userStatus: null,
        businessExists: false,
      },
    ]);

    expect(summary).toEqual({
      ownerAssignmentCount: 3,
      primaryOwnerCount: 1,
      activeOwnerCount: 1,
      inactiveOwnerCount: 2,
      missingProfileCount: 1,
      orphanBusinessLinkCount: 1,
      coverageScore: 33,
    });
  });

  it("retourne un score neutre sans propriétaire", () => {
    expect(buildSuperAdminOwnersSummary([])).toEqual({
      ownerAssignmentCount: 0,
      primaryOwnerCount: 0,
      activeOwnerCount: 0,
      inactiveOwnerCount: 0,
      missingProfileCount: 0,
      orphanBusinessLinkCount: 0,
      coverageScore: 0,
    });
  });
});
