import { MapPin, Store } from "lucide-react";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function OwnerStoresPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  const businesses = await getOwnerBusinesses(owner);
  const businessIds = businesses.map((business) => business.id);
  const stores = businessIds.length
    ? await supabaseAdmin
        .from("stores")
        .select(
          "id, business_id, name, code, city, region, status, is_headquarters",
        )
        .in("business_id", businessIds)
        .is("deleted_at", null)
        .order("created_at")
    : { data: [], error: null };
  if (stores.error) throw new Error(stores.error.message);
  const names = new Map(
    businesses.map((business) => [business.id, business.name]),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Mes boutiques</h1>
      <p className="text-muted mt-2 text-sm">
        Points de vente et établissements rattachés à vos entreprises.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(stores.data ?? []).map((store) => (
          <article
            key={store.id}
            className="rounded-2xl border border-[#e1e7e3] bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                <Store className="size-4" />
              </span>
              {store.is_headquarters && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-[9px] font-bold text-amber-700">
                  Siège
                </span>
              )}
            </div>
            <h2 className="mt-4 font-bold">{store.name}</h2>
            <p className="text-muted mt-1 text-xs">
              {names.get(store.business_id)}
            </p>
            <p className="text-muted mt-4 flex items-center gap-2 text-xs">
              <MapPin className="size-3.5" />{" "}
              {store.city ?? "Ville non renseignée"}
            </p>
          </article>
        ))}
      </div>
      {(stores.data ?? []).length === 0 && (
        <p className="text-muted mt-10 text-center text-sm">
          Créez d’abord une entreprise et sa première boutique.
        </p>
      )}
    </div>
  );
}
