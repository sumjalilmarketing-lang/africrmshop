import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuperAdminDashboard } from "@/components/super-admin/dashboard";
import { getSuperAdminSession } from "@/lib/auth";
import { getSuperAdminDashboardData } from "@/lib/super-admin-dashboard";

export const metadata: Metadata = {
  title: "Super administration",
  description: "Pilotage de la plateforme AFRICRM Shop.",
};

export default async function SuperAdminPage() {
  const superAdmin = await getSuperAdminSession();

  if (!superAdmin) {
    redirect("/connexion");
  }

  if (superAdmin.mustChangePassword) {
    redirect("/changer-mot-de-passe");
  }

  const dashboardData = await getSuperAdminDashboardData();

  return (
    <SuperAdminDashboard
      demoMode={false}
      data={dashboardData}
      admin={{
        displayName: superAdmin.displayName,
        email: superAdmin.email,
      }}
    />
  );
}
