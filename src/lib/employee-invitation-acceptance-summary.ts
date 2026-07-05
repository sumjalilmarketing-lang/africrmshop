export type EmployeeInvitationAcceptanceStep =
  | "authenticating"
  | "accepting"
  | "syncing"
  | "redirecting"
  | "failed";

export type EmployeeInvitationAcceptanceSummary = {
  title: string;
  description: string;
  progress: number;
  isError: boolean;
};

const acceptanceStepLabels: Record<
  EmployeeInvitationAcceptanceStep,
  EmployeeInvitationAcceptanceSummary
> = {
  authenticating: {
    title: "Vérification du lien",
    description: "Nous validons votre session Supabase et le lien reçu.",
    progress: 25,
    isError: false,
  },
  accepting: {
    title: "Activation de votre rôle",
    description:
      "Nous rattachons votre compte à l’entreprise et à la boutique.",
    progress: 55,
    isError: false,
  },
  syncing: {
    title: "Synchronisation de la session",
    description: "Nous préparons votre espace AFRICRM Shop.",
    progress: 80,
    isError: false,
  },
  redirecting: {
    title: "Accès prêt",
    description: "Redirection vers votre espace de travail.",
    progress: 100,
    isError: false,
  },
  failed: {
    title: "Invitation impossible",
    description: "Le lien n’a pas pu être validé.",
    progress: 100,
    isError: true,
  },
};

export function buildEmployeeInvitationAcceptanceSummary(input: {
  step: EmployeeInvitationAcceptanceStep;
  error: string | null;
}): EmployeeInvitationAcceptanceSummary {
  const summary = acceptanceStepLabels[input.step];

  if (input.step !== "failed") return summary;

  return {
    ...summary,
    description: input.error ?? summary.description,
  };
}
