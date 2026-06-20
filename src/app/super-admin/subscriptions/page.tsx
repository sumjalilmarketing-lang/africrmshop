import { ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function SuperAdminSubscriptionsPage() {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/connexion");
  const [plans, subscriptions] = await Promise.all([
    supabaseAdmin
      .from("subscription_plans")
      .select("id, code, name, limits, is_active")
      .order("sort_order"),
    supabaseAdmin
      .from("business_subscriptions")
      .select("id, plan_id, status, trial_ends_at, current_period_end"),
  ]);
  if (plans.error || subscriptions.error)
    throw new Error(plans.error?.message ?? subscriptions.error?.message);

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/super-admin"
          className="text-muted flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Abonnements</h1>
        <p className="text-muted mt-2 text-sm">
          Offres et abonnements des entreprises.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {(plans.data ?? []).map((plan) => {
            const planSubscriptions = (subscriptions.data ?? []).filter(
              (subscription) => subscription.plan_id === plan.id,
            );
            return (
              <article
                key={plan.id}
                className="rounded-2xl border border-[#e1e7e3] bg-white p-6"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                  <CreditCard className="size-4" />
                </span>
                <h2 className="mt-5 text-lg font-bold">{plan.name}</h2>
                <p className="text-muted mt-1 text-xs">{plan.code}</p>
                <p className="mt-6 text-3xl font-bold">
                  {planSubscriptions.length}
                </p>
                <p className="text-muted mt-1 text-xs">abonnement(s)</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["trialing", "active", "paused"].map((status) => (
                    <span
                      key={status}
                      className="rounded-full bg-[#f3f6f3] px-2 py-1 text-[9px] font-bold"
                    >
                      {status}:{" "}
                      {
                        planSubscriptions.filter(
                          (subscription) => subscription.status === status,
                        ).length
                      }
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
