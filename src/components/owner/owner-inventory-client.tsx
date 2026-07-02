"use client";

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  PackageSearch,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buildOwnerInventorySummary } from "@/lib/owner-inventory-summary";
import { cn } from "@/lib/utils";

export type OwnerInventoryBusiness = {
  id: string;
  name: string;
};

export type OwnerInventoryStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerInventoryRow = {
  id: string;
  businessId: string;
  businessName: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reservedQuantity: number;
  availableStock: number;
  lowStockThreshold: number;
};

type StockStatus = "all" | "ok" | "low" | "out";

const currencyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function toMoney(value: number) {
  return currencyFormatter.format(value);
}

function getStockStatus(row: OwnerInventoryRow) {
  if (row.availableStock <= 0) return "out";
  if (row.availableStock <= row.lowStockThreshold) return "low";
  return "ok";
}

export function OwnerInventoryClient({
  businesses,
  stores,
  rows,
}: Readonly<{
  businesses: OwnerInventoryBusiness[];
  stores: OwnerInventoryStore[];
  rows: OwnerInventoryRow[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [status, setStatus] = useState<StockStatus>("all");
  const [search, setSearch] = useState("");

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (businessId && row.businessId !== businessId) return false;
      if (storeId !== "all" && row.storeId !== storeId) return false;
      if (status !== "all" && getStockStatus(row) !== status) return false;
      if (!normalizedSearch) return true;

      return [row.productName, row.sku, row.categoryName, row.storeName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [businessId, rows, search, status, storeId]);

  const inventorySummary = useMemo(
    () => buildOwnerInventorySummary(filteredRows),
    [filteredRows],
  );
  const lowStockRows = filteredRows.filter(
    (row) => getStockStatus(row) === "low",
  );
  const outOfStockRows = filteredRows.filter(
    (row) => getStockStatus(row) === "out",
  );
  const healthyRows = filteredRows.filter(
    (row) => getStockStatus(row) === "ok",
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Stock disponible</p>
            <Boxes className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {inventorySummary.totalAvailableStock}
          </p>
          <p className="text-muted mt-1 text-xs">unités vendables</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Santé stock</p>
            <ShieldCheck
              className={cn(
                "size-5",
                inventorySummary.stockHealthRate >= 80
                  ? "text-[#0b7a4b]"
                  : inventorySummary.stockHealthRate >= 50
                    ? "text-amber-600"
                    : "text-red-700",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {inventorySummary.stockHealthRate}%
          </p>
          <p className="text-muted mt-1 text-xs">
            {inventorySummary.healthyCount} ligne(s) saines
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Alertes stock bas</p>
            <AlertTriangle className="size-5 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {inventorySummary.lowStockCount}
          </p>
          <p className="text-muted mt-1 text-xs">lignes à surveiller</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Ruptures</p>
            <PackageSearch className="size-5 text-red-600" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {inventorySummary.outOfStockCount}
          </p>
          <p className="text-muted mt-1 text-xs">produits à réapprovisionner</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Valeur vente</p>
            <TrendingUp className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {toMoney(inventorySummary.saleValuation)}
          </p>
          <p className="text-muted mt-1 text-xs">
            marge potentielle : {toMoney(inventorySummary.potentialMargin)}
          </p>
        </article>
      </div>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Tableau d&apos;inventaire</h2>
            <p className="text-muted mt-1 text-xs">
              Vue consolidée des stocks par boutique, avec alertes immédiates.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/owner/suppliers"
              className="rounded-2xl bg-[#14251d] px-4 py-3 text-xs font-black text-white"
            >
              Réceptionner du stock
            </Link>
            <Link
              href="/owner/products"
              className="rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-xs font-black text-[#0b7a4b]"
            >
              Ajuster un produit
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-xs font-bold">
            Entreprise
            <select
              value={businessId}
              onChange={(event) => changeBusiness(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Boutique
            <select
              value={storeId}
              onChange={(event) => setStoreId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
            >
              <option value="all">Toutes les boutiques</option>
              {filteredStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Statut
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StockStatus)}
              className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
            >
              <option value="all">Tous les statuts</option>
              <option value="ok">Stock OK</option>
              <option value="low">Stock bas</option>
              <option value="out">Rupture</option>
            </select>
          </label>
          <label className="relative block text-xs font-bold">
            Recherche
            <Search className="text-muted absolute bottom-3.5 left-4 size-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe4dd] py-3 pr-4 pl-11 text-sm outline-none focus:border-[#0b7a4b]"
              placeholder="Produit, SKU, boutique..."
            />
          </label>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e1e7e3]">
          <div className="text-muted hidden grid-cols-[1.3fr_0.9fr_0.7fr_0.7fr_0.7fr_0.8fr] bg-[#f6f8f6] px-4 py-3 text-[10px] font-black uppercase lg:grid">
            <span>Produit</span>
            <span>Boutique</span>
            <span>Dispo</span>
            <span>Seuil</span>
            <span>Valeur coût</span>
            <span>Statut</span>
          </div>
          <div className="divide-y divide-[#edf1ee]">
            {filteredRows.map((row) => {
              const rowStatus = getStockStatus(row);
              const statusLabel =
                rowStatus === "out"
                  ? "Rupture"
                  : rowStatus === "low"
                    ? "Stock bas"
                    : "OK";

              return (
                <article
                  key={row.id}
                  className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.3fr_0.9fr_0.7fr_0.7fr_0.7fr_0.8fr] lg:items-center"
                >
                  <div>
                    <p className="font-bold">{row.productName}</p>
                    <p className="text-muted mt-1 text-xs">
                      {row.sku ?? "Sans SKU"}
                      {row.categoryName ? ` · ${row.categoryName}` : ""}
                    </p>
                  </div>
                  <p className="text-muted text-xs">{row.storeName}</p>
                  <div>
                    <p className="font-black">{row.availableStock}</p>
                    <p className="text-muted text-[10px]">
                      réservé : {row.reservedQuantity}
                    </p>
                  </div>
                  <p className="text-xs font-bold">{row.lowStockThreshold}</p>
                  <p className="text-xs font-bold">
                    {toMoney(row.availableStock * row.costPrice)}
                  </p>
                  <span
                    className={cn(
                      "flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black",
                      rowStatus === "out" && "bg-red-50 text-red-700",
                      rowStatus === "low" && "bg-amber-50 text-amber-700",
                      rowStatus === "ok" && "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {rowStatus === "ok" ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <AlertTriangle className="size-3.5" />
                    )}
                    {statusLabel}
                  </span>
                </article>
              );
            })}
          </div>
        </div>

        {!filteredRows.length && (
          <div className="mt-6 rounded-3xl border border-dashed border-[#dbe4dd] bg-[#fbfcfb] p-8 text-center">
            <Boxes className="mx-auto size-8 text-[#0b7a4b]" />
            <p className="mt-3 text-sm font-bold">
              Aucune ligne d&apos;inventaire
            </p>
            <p className="text-muted mt-1 text-xs">
              Créez des produits, boutiques et réceptions pour alimenter cette
              vue.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-black text-emerald-800">Stock sain</p>
          <p className="mt-2 text-3xl font-black text-emerald-800">
            {healthyRows.length}
          </p>
          <p className="mt-1 text-xs font-bold text-emerald-700">
            {inventorySummary.stockHealthRate}% de santé
          </p>
        </article>
        <article className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-black text-amber-800">
            À commander bientôt
          </p>
          <p className="mt-2 text-3xl font-black text-amber-800">
            {lowStockRows.length}
          </p>
          <p className="mt-1 text-xs font-bold text-amber-700">
            seuils atteints
          </p>
        </article>
        <article className="rounded-3xl border border-red-100 bg-red-50 p-5">
          <p className="text-xs font-black text-red-800">Urgent</p>
          <p className="mt-2 text-3xl font-black text-red-800">
            {outOfStockRows.length}
          </p>
          <p className="mt-1 text-xs font-bold text-red-700">
            action immédiate
          </p>
        </article>
      </section>
    </div>
  );
}
