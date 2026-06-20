import { redirect } from "next/navigation";
import { OwnerBusinessForm } from "@/components/owner/owner-business-form";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function NewOwnerBusinessPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  const [activities, plans] = await Promise.all([
    supabaseAdmin
      .from("activity_types")
      .select("code, name, description, capabilities")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("subscription_plans")
      .select("code, name, description, limits, features")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (activities.error || plans.error) {
    throw new Error(activities.error?.message ?? plans.error?.message);
  }

  return (
    <OwnerBusinessForm
      activities={activities.data ?? []}
      plans={plans.data ?? []}
    />
  );
}
