import { Building2, Plus, Store, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";

export default async function OwnerBusinessesPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  const businesses = await getOwnerBusinesses(owner);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mes entreprises</h1>
          <p className="text-muted mt-2 text-sm">
            Gérez vos différentes activités AFRICRM Shop.
          </p>
        </div>
        <Link
          href="/owner/businesses/new"
          className="flex items-center gap-2 rounded-xl bg-[#0b7a4b] px-4 py-3 text-xs font-bold text-white"
        >
          <Plus className="size-4" /> Nouvelle entreprise
        </Link>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {businesses.map((business) => (
          <article
            key={business.id}
            className="rounded-2xl border border-[#e1e7e3] bg-white p-6"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-11 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                <Building2 className="size-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold">{business.name}</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                    {business.status}
                  </span>
                </div>
                <p className="text-muted mt-1 text-xs">
                  {business.activity?.name ?? "Activité non configurée"}
                </p>
                <div className="text-muted mt-5 flex gap-5 text-xs">
                  <span className="flex items-center gap-2">
                    <Store className="size-3.5" /> {business.storeCount}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="size-3.5" /> {business.employeeCount}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {businesses.length === 0 && (
        <p className="text-muted mt-10 text-center text-sm">
          Aucune entreprise pour le moment.
        </p>
      )}
    </div>
  );
}
