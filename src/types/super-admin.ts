export type DashboardBusiness = {
  id: string;
  name: string;
  initials: string;
  sector: string;
  plan: string;
  users: number;
  revenue: string;
  status: "Actif" | "Essai" | "Suspendu" | "Inactif";
  color: string;
};

export type SuperAdminDashboardData = {
  stats: {
    businesses: number;
    activeBusinesses: number;
    activeUsers: number;
    monthlyRevenue: string;
    collectedVolume: string;
    trialBusinesses: number;
    suspendedBusinesses: number;
    collectionRate: number;
    platformHealthScore: number;
  };
  businesses: DashboardBusiness[];
};
