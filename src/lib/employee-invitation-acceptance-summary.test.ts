import { describe, expect, it } from "vitest";
import { buildEmployeeInvitationAcceptanceSummary } from "@/lib/employee-invitation-acceptance-summary";

describe("buildEmployeeInvitationAcceptanceSummary", () => {
  it("décrit une étape d'acceptation en cours", () => {
    expect(
      buildEmployeeInvitationAcceptanceSummary({
        step: "accepting",
        error: null,
      }),
    ).toEqual({
      title: "Activation de votre rôle",
      description:
        "Nous rattachons votre compte à l’entreprise et à la boutique.",
      progress: 55,
      isError: false,
    });
  });

  it("affiche l'erreur utilisateur sur une acceptation échouée", () => {
    expect(
      buildEmployeeInvitationAcceptanceSummary({
        step: "failed",
        error: "Cette invitation a expiré.",
      }),
    ).toEqual({
      title: "Invitation impossible",
      description: "Cette invitation a expiré.",
      progress: 100,
      isError: true,
    });
  });
});
