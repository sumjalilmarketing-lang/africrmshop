export type SuperAdminOwnerSummaryInput = {
  status: string;
  isPrimary: boolean;
  userStatus: string | null;
  businessExists: boolean;
};

export type SuperAdminOwnersSummary = {
  ownerAssignmentCount: number;
  primaryOwnerCount: number;
  activeOwnerCount: number;
  inactiveOwnerCount: number;
  missingProfileCount: number;
  orphanBusinessLinkCount: number;
  coverageScore: number;
};

export function buildSuperAdminOwnersSummary(
  owners: SuperAdminOwnerSummaryInput[],
): SuperAdminOwnersSummary {
  const ownerAssignmentCount = owners.length;
  const primaryOwnerCount = owners.filter((owner) => owner.isPrimary).length;
  const activeOwnerCount = owners.filter(
    (owner) => owner.status === "active" && owner.userStatus === "active",
  ).length;
  const missingProfileCount = owners.filter(
    (owner) => owner.userStatus === null,
  ).length;
  const orphanBusinessLinkCount = owners.filter(
    (owner) => !owner.businessExists,
  ).length;
  const inactiveOwnerCount = owners.filter(
    (owner) => owner.status !== "active" || owner.userStatus !== "active",
  ).length;
  const validAssignmentCount = owners.filter(
    (owner) =>
      owner.status === "active" &&
      owner.userStatus === "active" &&
      owner.businessExists,
  ).length;

  return {
    ownerAssignmentCount,
    primaryOwnerCount,
    activeOwnerCount,
    inactiveOwnerCount,
    missingProfileCount,
    orphanBusinessLinkCount,
    coverageScore:
      ownerAssignmentCount === 0
        ? 0
        : Math.round((validAssignmentCount / ownerAssignmentCount) * 100),
  };
}
