import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildSuperAdminPlatformSummary } from "@/lib/super-admin-platform-summary";
import type {
  DashboardBusiness,
  SuperAdminDashboardData,
} from "@/types/super-admin";

const statusLabels: Record<string, DashboardBusiness["status"]> = {
  active: "Actif",
  trial: "Essai",
  suspended: "Suspendu",
  inactive: "Inactif",
};

const companyColors = [
  "bg-[#e7f4ec] text-brand",
  "bg-[#fff1d8] text-[#9b6b08]",
  "bg-[#e9effa] text-[#3769b2]",
  "bg-[#f2eafa] text-[#8051a8]",
] as const;

function formatMoney(amount: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount)} F`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [businessesResult, usersResult, salesResult, paymentsResult] =
    await Promise.all([
      supabaseAdmin
        .from("businesses")
        .select("id, name, legal_name, status, metadata, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("users")
        .select("business_id, status")
        .is("deleted_at", null),
      supabaseAdmin
        .from("sales")
        .select("business_id, total_amount, status")
        .gte("created_at", monthStart.toISOString()),
      supabaseAdmin
        .from("payments")
        .select("amount, status")
        .gte("created_at", monthStart.toISOString()),
    ]);

  const firstError =
    businessesResult.error ??
    usersResult.error ??
    salesResult.error ??
    paymentsResult.error;

  if (firstError) {
    throw new Error(`Dashboard Supabase : ${firstError.message}`);
  }

  const users = usersResult.data ?? [];
  const completedSales = (salesResult.data ?? []).filter(
    (sale) => sale.status === "completed",
  );
  const successfulPayments = (paymentsResult.data ?? []).filter((payment) =>
    ["completed", "successful", "paid"].includes(payment.status),
  );
  const monthlyRevenue = completedSales.reduce(
    (total, sale) => total + Number(sale.total_amount ?? 0),
    0,
  );
  const collectedVolume = successfulPayments.reduce(
    (total, payment) => total + Number(payment.amount ?? 0),
    0,
  );
  const platformSummary = buildSuperAdminPlatformSummary({
    businesses: (businessesResult.data ?? []).map((business) => ({
      status: business.status,
    })),
    users: users.map((user) => ({ status: user.status })),
    financials: {
      monthlyRevenue,
      collectedVolume,
    },
  });

  const businesses = (businessesResult.data ?? []).map((business, index) => {
    const metadata = (business.metadata ?? {}) as Record<string, unknown>;
    const businessSales = completedSales.filter(
      (sale) => sale.business_id === business.id,
    );

    return {
      id: business.id,
      name: business.name,
      initials: getInitials(business.name),
      sector:
        typeof metadata.sector === "string"
          ? metadata.sector
          : business.legal_name || "Entreprise",
      plan:
        typeof metadata.subscription_plan === "string"
          ? metadata.subscription_plan
          : "Non défini",
      users: users.filter((user) => user.business_id === business.id).length,
      revenue: formatMoney(
        businessSales.reduce(
          (total, sale) => total + Number(sale.total_amount ?? 0),
          0,
        ),
      ),
      status: statusLabels[business.status] ?? "Inactif",
      color: companyColors[index % companyColors.length],
    } satisfies DashboardBusiness;
  });

  return {
    stats: {
      businesses: businesses.length,
      activeBusinesses: businesses.filter(
        (business) => business.status === "Actif",
      ).length,
      activeUsers: users.filter((user) => user.status === "active").length,
      monthlyRevenue: formatMoney(monthlyRevenue),
      collectedVolume: formatMoney(collectedVolume),
      trialBusinesses: platformSummary.trialBusinessCount,
      suspendedBusinesses: platformSummary.suspendedBusinessCount,
      collectionRate: platformSummary.collectionRate,
      platformHealthScore: platformSummary.healthScore,
    },
    businesses,
  };
}
