import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Plus,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { buildSuperAdminBusinessesSummary } from "@/lib/super-admin-businesses-summary";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cn } from "@/lib/utils";

function getBusinessStatusClass(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "trial") return "bg-amber-50 text-amber-700";
  if (status === "suspended") return "bg-red-50 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default async function SuperAdminBusinessesPage() {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/connexion");
  if (admin.mustChangePassword) redirect("/changer-mot-de-passe");

  const [businesses, stores, activities] = await Promise.all([
    supabaseAdmin
      .from("businesses")
      .select(
        "id, name, slug, status, activity_type_id, onboarding_status, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("stores")
      .select("id, business_id")
      .is("deleted_at", null),
    supabaseAdmin.from("activity_types").select("id, name"),
  ]);

  if (businesses.error || stores.error || activities.error) {
    throw new Error(
      businesses.error?.message ??
        stores.error?.message ??
        activities.error?.message,
    );
  }

  const storeCountByBusinessId = new Map<string, number>();
  for (const store of stores.data ?? []) {
    storeCountByBusinessId.set(
      store.business_id,
      (storeCountByBusinessId.get(store.business_id) ?? 0) + 1,
    );
  }

  const activityMap = new Map(
    (activities.data ?? []).map((activity) => [activity.id, activity.name]),
  );
  const businessesSummary = buildSuperAdminBusinessesSummary(
    (businesses.data ?? []).map((business) => ({
      status: business.status,
      onboardingStatus: business.onboarding_status,
      activityTypeId: business.activity_type_id,
      storeCount: storeCountByBusinessId.get(business.id) ?? 0,
    })),
  );

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Link
              href="/super-admin"
              className="text-muted flex items-center gap-2 text-xs font-bold"
            >
              <ArrowLeft className="size-4" /> Dashboard
            </Link>
            <p className="mt-6 text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
              POS 45
            </p>
            <h1 className="mt-3 text-3xl font-bold">Entreprises</h1>
            <p className="text-muted mt-2 text-sm">
              Supervision de toutes les entreprises AFRICRM Shop, leur statut et
              leur préparation opérationnelle.
            </p>
          </div>
          <Link
            href="/super-admin/entreprises/nouvelle"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b7a4b] px-4 py-3 text-xs font-bold text-white"
          >
            <Plus className="size-4" /> Nouvelle entreprise
          </Link>
        </div>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Entreprises
              </p>
              <Building2 className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {businessesSummary.businessCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              {businessesSummary.activeBusinessCount} active(s),{" "}
              {businessesSummary.trialBusinessCount} essai(s)
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Boutiques
              </p>
              <Store className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {businessesSummary.storeCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              {businessesSummary.storelessBusinessCount} entreprise(s) sans
              boutique
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Prêtes
              </p>
              <ShieldCheck className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black text-[#0b7a4b]">
              {businessesSummary.readinessScore}%
            </p>
            <p className="text-muted mt-1 text-xs">score opérationnel</p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Anomalies
              </p>
              <CircleAlert className="size-4 text-red-600" />
            </div>
            <p className="mt-3 text-2xl font-black text-red-700">
              {businessesSummary.suspendedBusinessCount +
                businessesSummary.missingActivityCount +
                businessesSummary.onboardingIncompleteCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              suspendues, activité ou onboarding incomplet
            </p>
          </article>
        </section>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(businesses.data ?? []).map((business) => {
            const storeCount = storeCountByBusinessId.get(business.id) ?? 0;

            return (
              <article
                key={business.id}
                className="rounded-2xl border border-[#e1e7e3] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                    <Building2 className="size-4" />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold",
                      getBusinessStatusClass(business.status),
                    )}
                  >
                    {business.status}
                  </span>
                </div>
                <h2 className="mt-4 font-bold">{business.name}</h2>
                <p className="text-muted mt-1 text-xs">
                  {business.activity_type_id
                    ? (activityMap.get(business.activity_type_id) ??
                      "Activité inconnue")
                    : "Activité non configurée"}
                </p>
                <p className="text-muted mt-5 flex items-center gap-2 text-xs">
                  <Store className="size-3.5" /> {storeCount} boutique(s)
                </p>
                {business.onboarding_status &&
                  business.onboarding_status !== "completed" && (
                    <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700">
                      Onboarding : {business.onboarding_status}
                    </p>
                  )}
              </article>
            );
          })}
        </div>

        {(businesses.data ?? []).length === 0 && (
          <p className="text-muted mt-10 text-center text-sm">
            Aucune entreprise créée pour le moment.
          </p>
        )}
      </div>
    </main>
  );
}
