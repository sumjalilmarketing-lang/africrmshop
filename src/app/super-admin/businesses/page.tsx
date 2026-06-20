import { ArrowLeft, Building2, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function SuperAdminBusinessesPage() {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/connexion");
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
  if (businesses.error || stores.error || activities.error)
    throw new Error(
      businesses.error?.message ??
        stores.error?.message ??
        activities.error?.message,
    );
  const activityMap = new Map(
    (activities.data ?? []).map((activity) => [activity.id, activity.name]),
  );

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between">
          <div>
            <Link
              href="/super-admin"
              className="text-muted flex items-center gap-2 text-xs font-bold"
            >
              <ArrowLeft className="size-4" /> Dashboard
            </Link>
            <h1 className="mt-6 text-3xl font-bold">Entreprises</h1>
            <p className="text-muted mt-2 text-sm">
              Supervision de toutes les entreprises AFRICRM Shop.
            </p>
          </div>
          <Link
            href="/super-admin/entreprises/nouvelle"
            className="rounded-xl bg-[#0b7a4b] px-4 py-3 text-xs font-bold text-white"
          >
            Nouvelle entreprise
          </Link>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(businesses.data ?? []).map((business) => (
            <article
              key={business.id}
              className="rounded-2xl border border-[#e1e7e3] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                  <Building2 className="size-4" />
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  {business.status}
                </span>
              </div>
              <h2 className="mt-4 font-bold">{business.name}</h2>
              <p className="text-muted mt-1 text-xs">
                {business.activity_type_id
                  ? activityMap.get(business.activity_type_id)
                  : "Activité non configurée"}
              </p>
              <p className="text-muted mt-5 flex items-center gap-2 text-xs">
                <Store className="size-3.5" />{" "}
                {
                  (stores.data ?? []).filter(
                    (store) => store.business_id === business.id,
                  ).length
                }{" "}
                boutique(s)
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
