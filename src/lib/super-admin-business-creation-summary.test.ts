import { describe, expect, it } from "vitest";
import { buildSuperAdminBusinessCreationSummary } from "@/lib/super-admin-business-creation-summary";

describe("buildSuperAdminBusinessCreationSummary", () => {
  it("calcule la préparation de création d'une entreprise Super Admin", () => {
    const summary = buildSuperAdminBusinessCreationSummary({
      activities: [{ code: "boutique", name: "Boutique" }],
      plans: [{ code: "business", name: "Business" }],
      draft: {
        name: "Teranga Market",
        sector: "Commerce",
        activityTypeCode: "boutique",
        plan: "business",
        ownerFirstName: "Awa",
        ownerLastName: "Diop",
        ownerEmail: "awa@example.com",
      },
    });

    expect(summary).toEqual({
      activityCount: 1,
      planCount: 1,
      selectedActivityLabel: "Boutique",
      selectedPlanLabel: "Business",
      hasBusinessIdentity: true,
      hasOwnerIdentity: true,
      hasCatalogSelection: true,
      canPrepareCreation: true,
      readinessScore: 100,
    });
  });

  it("signale un catalogue incomplet ou une saisie insuffisante", () => {
    const summary = buildSuperAdminBusinessCreationSummary({
      activities: [],
      plans: [{ code: "starter", name: "Starter" }],
      draft: {
        name: "A",
        sector: "",
        activityTypeCode: "boutique",
        plan: "starter",
        ownerFirstName: "Awa",
        ownerLastName: "",
        ownerEmail: "awa",
      },
    });

    expect(summary).toEqual({
      activityCount: 0,
      planCount: 1,
      selectedActivityLabel: "Activité non sélectionnée",
      selectedPlanLabel: "Starter",
      hasBusinessIdentity: false,
      hasOwnerIdentity: false,
      hasCatalogSelection: false,
      canPrepareCreation: false,
      readinessScore: 20,
    });
  });
});
