import { Building2, CalendarDays, Store, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";

export default async function OwnerDashboardPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  const businesses = await getOwnerBusinesses(owner);
  const storeCount = businesses.reduce(
    (total, business) => total + business.storeCount,
    0,
  );
  const employeeCount = businesses.reduce(
    (total, business) => total + business.employeeCount,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[#0b7a4b]">Vue d’ensemble</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
            Bonjour, {owner.displayName}
          </h1>
          <p className="text-muted mt-2 text-sm">
            Pilotez vos entreprises, vos boutiques et votre équipe.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          [Building2, "Entreprises", businesses.length],
          [Store, "Boutiques", storeCount],
          [Users, "Employés actifs", employeeCount],
        ].map(([Icon, label, value]) => {
          const MetricIcon = Icon as typeof Building2;
          return (
            <article
              key={label as string}
              className="rounded-2xl border border-[#e1e7e3] bg-white p-5"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                <MetricIcon className="size-4" />
              </span>
              <p className="mt-5 text-2xl font-bold">{value as number}</p>
              <p className="text-muted mt-1 text-xs">{label as string}</p>
            </article>
          );
        })}
      </div>

      {businesses.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-[#bdd6c6] bg-white p-8 text-center sm:p-12">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
            <Store className="size-6" />
          </span>
          <h2 className="mt-5 text-2xl font-bold">
            Créez votre première entreprise
          </h2>
          <p className="text-muted mx-auto mt-3 max-w-lg text-sm leading-6">
            Choisissez votre activité, configurez votre première boutique et
            commencez à vendre ou à gérer vos rendez-vous.
          </p>
          <Link
            href="/owner/businesses/new"
            className="mt-6 inline-flex rounded-xl bg-[#0b7a4b] px-5 py-3 text-sm font-bold text-white"
          >
            Commencer l’onboarding
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-[#e1e7e3] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Mes entreprises</h2>
              <p className="text-muted mt-1 text-xs">
                Accès rapide à vos activités
              </p>
            </div>
            <Link
              href="/owner/businesses"
              className="text-xs font-bold text-[#0b7a4b]"
            >
              Voir tout
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((business) => (
              <article
                key={business.id}
                className="rounded-2xl border border-[#e5e9e6] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                    {business.status}
                  </span>
                  <CalendarDays className="text-muted size-4" />
                </div>
                <h3 className="mt-4 text-base font-bold">{business.name}</h3>
                <p className="text-muted mt-1 text-xs">
                  {business.activity?.name ?? "Activité à configurer"}
                </p>
                <div className="text-muted mt-5 flex gap-4 text-[10px]">
                  <span>{business.storeCount} boutique(s)</span>
                  <span>{business.employeeCount} employé(s)</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
