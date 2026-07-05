import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  PauseCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { buildSuperAdminSubscriptionsSummary } from "@/lib/super-admin-subscriptions-summary";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cn } from "@/lib/utils";

function getPlanStatusClass(isActive: boolean) {
  return isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-700";
}

function getSubscriptionStatusClass(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "trialing") return "bg-amber-50 text-amber-700";
  if (status === "paused") return "bg-slate-100 text-slate-700";

  return "bg-red-50 text-red-700";
}

export default async function SuperAdminSubscriptionsPage() {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/connexion");
  if (admin.mustChangePassword) redirect("/changer-mot-de-passe");

  const [plans, subscriptions] = await Promise.all([
    supabaseAdmin
      .from("subscription_plans")
      .select("id, code, name, limits, is_active")
      .order("sort_order"),
    supabaseAdmin
      .from("business_subscriptions")
      .select("id, plan_id, status, trial_ends_at, current_period_end"),
  ]);

  if (plans.error || subscriptions.error) {
    throw new Error(plans.error?.message ?? subscriptions.error?.message);
  }

  const subscriptionsSummary = buildSuperAdminSubscriptionsSummary({
    plans: (plans.data ?? []).map((plan) => ({
      id: plan.id,
      isActive: plan.is_active,
    })),
    subscriptions: (subscriptions.data ?? []).map((subscription) => ({
      planId: subscription.plan_id,
      status: subscription.status,
      trialEndsAt: subscription.trial_ends_at,
      currentPeriodEnd: subscription.current_period_end,
    })),
    today: new Date().toISOString().slice(0, 10),
  });

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/super-admin"
          className="text-muted flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>

        <p className="mt-6 text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 46
        </p>
        <h1 className="mt-3 text-3xl font-bold">Abonnements</h1>
        <p className="text-muted mt-2 text-sm">
          Offres, abonnements des entreprises et signaux de monétisation.
        </p>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Plans actifs
              </p>
              <CreditCard className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {subscriptionsSummary.activePlanCount}/
              {subscriptionsSummary.planCount}
            </p>
            <p className="text-muted mt-1 text-xs">offres commercialisables</p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Abonnements actifs
              </p>
              <ShieldCheck className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black text-[#0b7a4b]">
              {subscriptionsSummary.activeSubscriptionCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              score monétisation {subscriptionsSummary.monetizationScore}%
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                À relancer
              </p>
              <CalendarClock className="size-4 text-amber-600" />
            </div>
            <p className="mt-3 text-2xl font-black text-amber-700">
              {subscriptionsSummary.endingSoonCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              essais ou périodes proches
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Anomalies
              </p>
              <TriangleAlert className="size-4 text-red-600" />
            </div>
            <p className="mt-3 text-2xl font-black text-red-700">
              {subscriptionsSummary.pausedSubscriptionCount +
                subscriptionsSummary.orphanSubscriptionCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              pauses ou abonnements sans plan valide
            </p>
          </article>
        </section>

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
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                    <CreditCard className="size-4" />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold",
                      getPlanStatusClass(plan.is_active),
                    )}
                  >
                    {plan.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
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
                      className={cn(
                        "rounded-full px-2 py-1 text-[9px] font-bold",
                        getSubscriptionStatusClass(status),
                      )}
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
                {planSubscriptions.some(
                  (subscription) => subscription.status === "paused",
                ) && (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-700">
                    <PauseCircle className="size-3.5" /> Pause à surveiller
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {(plans.data ?? []).length === 0 && (
          <p className="text-muted mt-10 text-center text-sm">
            Aucun plan d’abonnement configuré.
          </p>
        )}
      </div>
    </main>
  );
}
