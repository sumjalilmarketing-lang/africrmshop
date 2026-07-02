"use client";

import {
  BadgeCheck,
  Loader2,
  PackageCheck,
  PackagePlus,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildOwnerSuppliersSummary } from "@/lib/owner-suppliers-summary";
import { cn } from "@/lib/utils";

export type OwnerSupplierBusiness = {
  id: string;
  name: string;
};

export type OwnerSupplierStore = {
  id: string;
  businessId: string;
  name: string;
  city: string | null;
};

export type OwnerSupplierProduct = {
  id: string;
  businessId: string;
  name: string;
  sku: string | null;
  costPrice: number;
};

export type OwnerSupplierItem = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

export type OwnerStockReception = {
  id: string;
  businessId: string;
  storeName: string;
  productName: string;
  supplierName: string | null;
  quantity: number;
  unitCost: number;
  reference: string | null;
  createdAt: string;
};

type SupplierFormState = {
  businessId: string;
  name: string;
  phone: string;
  email: string;
};

type ReceptionFormState = {
  businessId: string;
  storeId: string;
  productId: string;
  supplierId: string;
  quantity: string;
  unitCost: string;
  reference: string;
  notes: string;
};

const currencyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function toMoney(value: number) {
  return currencyFormatter.format(value);
}

function createSupplierForm(
  businesses: OwnerSupplierBusiness[],
): SupplierFormState {
  return {
    businessId: businesses[0]?.id ?? "",
    name: "",
    phone: "",
    email: "",
  };
}

function createReceptionForm(
  businesses: OwnerSupplierBusiness[],
  stores: OwnerSupplierStore[],
  products: OwnerSupplierProduct[],
  suppliers: OwnerSupplierItem[],
): ReceptionFormState {
  const businessId = businesses[0]?.id ?? "";
  const product = products.find((item) => item.businessId === businessId);

  return {
    businessId,
    storeId: stores.find((store) => store.businessId === businessId)?.id ?? "",
    productId: product?.id ?? "",
    supplierId:
      suppliers.find((supplier) => supplier.businessId === businessId)?.id ??
      "",
    quantity: "1",
    unitCost: product ? String(product.costPrice) : "",
    reference: "",
    notes: "Réception fournisseur",
  };
}

export function OwnerSuppliersClient({
  businesses,
  stores,
  products,
  suppliers,
  receptions,
}: Readonly<{
  businesses: OwnerSupplierBusiness[];
  stores: OwnerSupplierStore[];
  products: OwnerSupplierProduct[];
  suppliers: OwnerSupplierItem[];
  receptions: OwnerStockReception[];
}>) {
  const router = useRouter();
  const [supplierForm, setSupplierForm] = useState(() =>
    createSupplierForm(businesses),
  );
  const [receptionForm, setReceptionForm] = useState(() =>
    createReceptionForm(businesses, stores, products, suppliers),
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [isReceivingStock, setIsReceivingStock] = useState(false);
  const suppliersSummary = useMemo(
    () => buildOwnerSuppliersSummary({ suppliers, receptions }),
    [receptions, suppliers],
  );

  const selectedBusinessStores = stores.filter(
    (store) => store.businessId === receptionForm.businessId,
  );
  const selectedBusinessProducts = products.filter(
    (product) => product.businessId === receptionForm.businessId,
  );
  const selectedBusinessSuppliers = suppliers.filter(
    (supplier) => supplier.businessId === receptionForm.businessId,
  );
  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (
        supplierForm.businessId &&
        supplier.businessId !== supplierForm.businessId
      ) {
        return false;
      }
      if (!normalizedSearch) return true;

      return [supplier.name, supplier.phone, supplier.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [search, supplierForm.businessId, suppliers]);

  function updateSupplierField(name: keyof SupplierFormState, value: string) {
    setSupplierForm((current) => ({ ...current, [name]: value }));
  }

  function updateReceptionField(name: keyof ReceptionFormState, value: string) {
    setReceptionForm((current) => {
      if (name !== "businessId") return { ...current, [name]: value };

      const product = products.find((item) => item.businessId === value);
      return {
        ...current,
        businessId: value,
        storeId: stores.find((store) => store.businessId === value)?.id ?? "",
        productId: product?.id ?? "",
        unitCost: product ? String(product.costPrice) : "",
        supplierId:
          suppliers.find((supplier) => supplier.businessId === value)?.id ?? "",
      };
    });
  }

  async function submitSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsCreatingSupplier(true);

    const response = await fetch("/api/owner/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supplierForm),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setIsCreatingSupplier(false);
    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "Le fournisseur n'a pas pu être créé.",
      });
      return;
    }

    setStatus({ type: "success", message: "Fournisseur créé avec succès." });
    setSupplierForm((current) => ({
      ...current,
      name: "",
      phone: "",
      email: "",
    }));
    router.refresh();
  }

  async function submitReception(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsReceivingStock(true);

    const response = await fetch("/api/owner/stock-receptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(receptionForm),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setIsReceivingStock(false);
    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "La réception de stock a échoué.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Réception enregistrée. Le stock POS est mis à jour.",
    });
    setReceptionForm((current) => ({
      ...current,
      quantity: "1",
      reference: "",
      notes: "Réception fournisseur",
    }));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Fournisseurs</p>
            <Truck className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {suppliersSummary.supplierCount}
          </p>
          <p className="text-muted mt-1 text-xs">
            {suppliersSummary.supplierWithoutContactCount} sans contact
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Qualité contacts</p>
            <ShieldCheck
              className={cn(
                "size-5",
                suppliersSummary.contactQualityRate >= 80
                  ? "text-[#0b7a4b]"
                  : suppliersSummary.contactQualityRate >= 50
                    ? "text-amber-600"
                    : "text-red-700",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {suppliersSummary.contactQualityRate}%
          </p>
          <p className="text-muted mt-1 text-xs">
            {suppliersSummary.supplierWithContactCount} joignable(s)
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Réceptions</p>
            <PackageCheck className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {suppliersSummary.receptionCount}
          </p>
          <p className="text-muted mt-1 text-xs">
            {suppliersSummary.totalReceivedQuantity} unité(s) reçue(s)
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Valeur reçue</p>
            <PackagePlus className="size-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {toMoney(suppliersSummary.totalReceptionValue)}
          </p>
          <p className="text-muted mt-1 text-xs">
            moyenne {toMoney(suppliersSummary.averageReceptionValue)}
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Traçabilité</p>
            <BadgeCheck className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {suppliersSummary.receptionCount === 0
              ? 100
              : Math.round(
                  (suppliersSummary.receptionWithSupplierCount /
                    suppliersSummary.receptionCount) *
                    100,
                )}
            %
          </p>
          <p className="text-muted mt-1 text-xs">réceptions avec fournisseur</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-6">
          <form
            onSubmit={submitSupplier}
            className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
                <Truck className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Nouveau fournisseur</h2>
                <p className="text-muted mt-1 text-xs">
                  Enregistrez les partenaires qui alimentent votre stock.
                </p>
              </div>
            </div>

            {status && (
              <div
                className={cn(
                  "mt-5 rounded-2xl border px-4 py-3 text-xs font-semibold",
                  status.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {status.message}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <label className="block text-xs font-bold">
                Entreprise
                <select
                  value={supplierForm.businessId}
                  onChange={(event) =>
                    updateSupplierField("businessId", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold">
                Nom fournisseur
                <input
                  value={supplierForm.name}
                  onChange={(event) =>
                    updateSupplierField("name", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="Ex : Grossiste Sandaga"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold">
                  Téléphone
                  <input
                    value={supplierForm.phone}
                    onChange={(event) =>
                      updateSupplierField("phone", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    placeholder="+221..."
                  />
                </label>
                <label className="block text-xs font-bold">
                  Email
                  <input
                    value={supplierForm.email}
                    onChange={(event) =>
                      updateSupplierField("email", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    placeholder="contact@..."
                    type="email"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isCreatingSupplier || !businesses.length}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#08653e] disabled:opacity-60"
              >
                {isCreatingSupplier && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Créer le fournisseur
              </button>
            </div>
          </form>

          <form
            onSubmit={submitReception}
            className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#fff4df] text-amber-700">
                <PackagePlus className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold">Réception de stock</h2>
                <p className="text-muted mt-1 text-xs">
                  Ajoutez les arrivages fournisseur dans une boutique.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-xs font-bold">
                Entreprise
                <select
                  value={receptionForm.businessId}
                  onChange={(event) =>
                    updateReceptionField("businessId", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  required
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
                  value={receptionForm.storeId}
                  onChange={(event) =>
                    updateReceptionField("storeId", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                >
                  {selectedBusinessStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold">
                Produit
                <select
                  value={receptionForm.productId}
                  onChange={(event) => {
                    const product = products.find(
                      (item) => item.id === event.target.value,
                    );
                    setReceptionForm((current) => ({
                      ...current,
                      productId: event.target.value,
                      unitCost: product ? String(product.costPrice) : "",
                    }));
                  }}
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                >
                  {selectedBusinessProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku ? `· ${product.sku}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold">
                Fournisseur
                <select
                  value={receptionForm.supplierId}
                  onChange={(event) =>
                    updateReceptionField("supplierId", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                >
                  <option value="">Sans fournisseur</option>
                  {selectedBusinessSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold">
                  Quantité reçue
                  <input
                    value={receptionForm.quantity}
                    onChange={(event) =>
                      updateReceptionField("quantity", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    min="1"
                    step="1"
                    type="number"
                    required
                  />
                </label>
                <label className="block text-xs font-bold">
                  Coût unitaire
                  <input
                    value={receptionForm.unitCost}
                    onChange={(event) =>
                      updateReceptionField("unitCost", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    min="0"
                    step="1"
                    type="number"
                    required
                  />
                </label>
              </div>
              <label className="block text-xs font-bold">
                Référence facture / bon
                <input
                  value={receptionForm.reference}
                  onChange={(event) =>
                    updateReceptionField("reference", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="BL-2026-001"
                />
              </label>
              <label className="block text-xs font-bold">
                Note
                <input
                  value={receptionForm.notes}
                  onChange={(event) =>
                    updateReceptionField("notes", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="Réception fournisseur"
                />
              </label>
              <button
                type="submit"
                disabled={
                  isReceivingStock ||
                  !receptionForm.storeId ||
                  !receptionForm.productId
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#243a2f] disabled:opacity-60"
              >
                {isReceivingStock ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PackageCheck className="size-4" />
                )}
                Enregistrer la réception
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-bold">Fournisseurs</h2>
                <p className="text-muted mt-1 text-xs">
                  Liste des fournisseurs actifs de l&apos;entreprise.
                </p>
              </div>
              <label className="relative">
                <Search className="text-muted absolute top-1/2 left-4 size-4 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-2xl border border-[#dbe4dd] py-3 pr-4 pl-11 text-sm outline-none focus:border-[#0b7a4b] md:w-72"
                  placeholder="Rechercher..."
                />
              </label>
            </div>

            <div className="mt-5 divide-y divide-[#edf1ee] overflow-hidden rounded-2xl border border-[#e1e7e3]">
              {filteredSuppliers.map((supplier) => (
                <article
                  key={supplier.id}
                  className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1fr_0.8fr_0.8fr]"
                >
                  <p className="font-bold">{supplier.name}</p>
                  <p className="text-muted text-xs">
                    {supplier.phone ?? "Téléphone non renseigné"}
                  </p>
                  <p className="text-muted text-xs">
                    {supplier.email ?? "Email non renseigné"}
                  </p>
                </article>
              ))}
            </div>

            {!filteredSuppliers.length && (
              <p className="text-muted mt-6 text-center text-sm">
                Aucun fournisseur enregistré pour le moment.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Dernières réceptions</h2>
            <p className="text-muted mt-1 text-xs">
              Historique récent des entrées fournisseur.
            </p>

            <div className="mt-5 space-y-3">
              {receptions.map((reception) => (
                <article
                  key={reception.id}
                  className="rounded-2xl border border-[#edf1ee] bg-[#fbfcfb] p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold">{reception.productName}</p>
                      <p className="text-muted mt-1 text-xs">
                        {reception.storeName} ·{" "}
                        {reception.supplierName ?? "Sans fournisseur"}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#0b7a4b]">
                      +{reception.quantity} unité(s)
                    </p>
                  </div>
                  <div className="text-muted mt-3 flex flex-wrap gap-3 text-[11px]">
                    <span>Coût : {toMoney(reception.unitCost)}</span>
                    {reception.reference && (
                      <span>Ref : {reception.reference}</span>
                    )}
                    <span>
                      {new Date(reception.createdAt).toLocaleDateString(
                        "fr-SN",
                      )}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {!receptions.length && (
              <p className="text-muted mt-6 text-center text-sm">
                Aucune réception fournisseur enregistrée.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
