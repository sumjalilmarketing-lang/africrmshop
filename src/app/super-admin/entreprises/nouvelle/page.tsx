import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateBusinessForm } from "@/components/super-admin/create-business-form";
import { getSuperAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = {
  title: "Nouvelle entreprise",
  description: "Créer une entreprise cliente AFRICRM Shop.",
};

export default async function NewBusinessPage() {
  const superAdmin = await getSuperAdminSession();

  if (!superAdmin) redirect("/connexion");
  if (superAdmin.mustChangePassword) redirect("/changer-mot-de-passe");

  const [activities, plans] = await Promise.all([
    supabaseAdmin
      .from("activity_types")
      .select("code, name")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("subscription_plans")
      .select("code, name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (activities.error || plans.error) {
    throw new Error(activities.error?.message ?? plans.error?.message);
  }

  return (
    <CreateBusinessForm
      activities={activities.data ?? []}
      plans={plans.data ?? []}
    />
  );
}
