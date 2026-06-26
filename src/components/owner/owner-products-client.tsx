"use client";

import {
  AlertCircle,
  Edit3,
  Loader2,
  PackageMinus,
  PackagePlus,
  Save,
  Search,
  Store,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type OwnerProductBusiness = {
  id: string;
  name: string;
};

export type OwnerProductStore = {
  id: string;
  businessId: string;
  name: string;
  city: string | null;
};

export type OwnerProductListItem = {
  id: string;
  businessId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  totalStock: number;
  stockByStore: {
    storeId: string;
    storeName: string;
    quantity: number;
    reservedQuantity: number;
    availableStock: number;
  }[];
  lowStockThreshold: number | null;
  isActive: boolean;
};

type ProductFormState = {
  businessId: string;
  storeId: string;
  name: string;
  categoryName: string;
  sku: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  taxRate: string;
  quantity: string;
  lowStockThreshold: string;
};

type EditProductFormState = {
  name: string;
  categoryName: string;
  sku: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  taxRate: string;
  lowStockThreshold: string;
};

type StockAdjustmentFormState = {
  storeId: string;
  quantityDelta: string;
  reason: string;
};

const currencyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function toMoney(value: number) {
  return currencyFormatter.format(value);
}

function createInitialForm(
  businesses: OwnerProductBusiness[],
  stores: OwnerProductStore[],
): ProductFormState {
  const businessId = businesses[0]?.id ?? "";
  const storeId =
    stores.find((store) => store.businessId === businessId)?.id ?? "";

  return {
    businessId,
    storeId,
    name: "",
    categoryName: "",
    sku: "",
    barcode: "",
    costPrice: "0",
    sellingPrice: "",
    taxRate: "18",
    quantity: "0",
    lowStockThreshold: "5",
  };
}

function createEditForm(product: OwnerProductListItem): EditProductFormState {
  return {
    name: product.name,
    categoryName: product.categoryName ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    costPrice: String(product.costPrice),
    sellingPrice: String(product.sellingPrice),
    taxRate: String(product.taxRate),
    lowStockThreshold: String(product.lowStockThreshold ?? 0),
  };
}

export function OwnerProductsClient({
  businesses,
  stores,
  products,
}: Readonly<{
  businesses: OwnerProductBusiness[];
  stores: OwnerProductStore[];
  products: OwnerProductListItem[];
}>) {
  const router = useRouter();
  const [form, setForm] = useState(() => createInitialForm(businesses, stores));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;
  const [editForm, setEditForm] = useState<EditProductFormState | null>(null);
  const [stockForm, setStockForm] = useState<StockAdjustmentFormState>({
    storeId: "",
    quantityDelta: "",
    reason: "Correction inventaire",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const selectedBusinessStores = stores.filter(
    (store) => store.businessId === form.businessId,
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products.filter((product) => {
      if (form.businessId && product.businessId !== form.businessId)
        return false;
      if (!normalizedSearch) return true;

      return [product.name, product.sku, product.barcode, product.categoryName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [form.businessId, products, search]);

  const totalStock = filteredProducts.reduce(
    (total, product) => total + product.totalStock,
    0,
  );
  const lowStockCount = filteredProducts.filter(
    (product) =>
      product.lowStockThreshold !== null &&
      product.totalStock <= product.lowStockThreshold,
  ).length;
  const selectedBusinessStoresForStock = selectedProduct
    ? stores.filter((store) => store.businessId === selectedProduct.businessId)
    : [];
  const selectedStoreStock = selectedProduct?.stockByStore.find(
    (stock) => stock.storeId === stockForm.storeId,
  );

  function updateField(name: keyof ProductFormState, value: string) {
    setForm((current) => {
      if (name !== "businessId") return { ...current, [name]: value };

      const nextStoreId =
        stores.find((store) => store.businessId === value)?.id ?? "";
      return { ...current, businessId: value, storeId: nextStoreId };
    });
  }

  function selectProduct(product: OwnerProductListItem) {
    const firstStock = product.stockByStore[0];
    setSelectedProductId(product.id);
    setEditForm(createEditForm(product));
    setStockForm({
      storeId: firstStock?.storeId ?? "",
      quantityDelta: "",
      reason: "Correction inventaire",
    });
    setStatus(null);
  }

  function updateEditField(name: keyof EditProductFormState, value: string) {
    setEditForm((current) =>
      current ? { ...current, [name]: value } : current,
    );
  }

  function updateStockField(
    name: keyof StockAdjustmentFormState,
    value: string,
  ) {
    setStockForm((current) => ({ ...current, [name]: value }));
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!form.businessId || !form.storeId) {
      setStatus({
        type: "error",
        message: "Créez d'abord une entreprise et une boutique active.",
      });
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/owner/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setIsSubmitting(false);
    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "Le produit n'a pas pu être créé.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Produit créé. Il est maintenant disponible dans la caisse POS.",
    });
    setForm((current) => ({
      ...current,
      name: "",
      categoryName: "",
      sku: "",
      barcode: "",
      costPrice: "0",
      sellingPrice: "",
      quantity: "0",
      lowStockThreshold: "5",
    }));
    router.refresh();
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct || !editForm) return;

    setStatus(null);
    setIsEditing(true);
    const response = await fetch(`/api/owner/products/${selectedProduct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setIsEditing(false);

    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "Le produit n'a pas pu être modifié.",
      });
      return;
    }

    setStatus({ type: "success", message: "Produit modifié avec succès." });
    router.refresh();
  }

  async function submitStockAdjustment(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!selectedProduct) return;

    setStatus(null);
    setIsAdjustingStock(true);
    const response = await fetch(
      `/api/owner/products/${selectedProduct.id}/stock-adjustments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockForm),
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setIsAdjustingStock(false);

    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "Le stock n'a pas pu être ajusté.",
      });
      return;
    }

    setStatus({ type: "success", message: "Stock ajusté avec succès." });
    setStockForm((current) => ({ ...current, quantityDelta: "" }));
    router.refresh();
  }

  async function deactivateProduct() {
    if (!selectedProduct) return;

    const confirmed = window.confirm(
      `Désactiver "${selectedProduct.name}" ? Il ne sera plus disponible dans le POS.`,
    );
    if (!confirmed) return;

    setStatus(null);
    setIsDeactivating(true);
    const response = await fetch(`/api/owner/products/${selectedProduct.id}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setIsDeactivating(false);

    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "Le produit n'a pas pu être désactivé.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Produit désactivé. Il n'apparaît plus dans le POS.",
    });
    setSelectedProductId(null);
    setEditForm(null);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
            <PackagePlus className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Nouveau produit</h2>
            <p className="text-muted mt-1 text-xs">
              Ajoutez un article vendable et son stock initial.
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

        <form className="mt-6 space-y-4" onSubmit={submitProduct}>
          <label className="block text-xs font-bold">
            Entreprise
            <select
              value={form.businessId}
              onChange={(event) =>
                updateField("businessId", event.target.value)
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
            Boutique concernée
            <select
              value={form.storeId}
              onChange={(event) => updateField("storeId", event.target.value)}
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
            Nom du produit
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
              placeholder="Ex : Shampooing hydratant"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Catégorie
              <input
                value={form.categoryName}
                onChange={(event) =>
                  updateField("categoryName", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                placeholder="Beauté"
              />
            </label>
            <label className="block text-xs font-bold">
              Référence SKU
              <input
                value={form.sku}
                onChange={(event) => updateField("sku", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                placeholder="SKU-001"
              />
            </label>
          </div>

          <label className="block text-xs font-bold">
            Code-barres
            <input
              value={form.barcode}
              onChange={(event) => updateField("barcode", event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
              placeholder="Optionnel"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Prix d&apos;achat
              <input
                value={form.costPrice}
                onChange={(event) =>
                  updateField("costPrice", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                min="0"
                step="1"
                type="number"
                required
              />
            </label>
            <label className="block text-xs font-bold">
              Prix de vente
              <input
                value={form.sellingPrice}
                onChange={(event) =>
                  updateField("sellingPrice", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                min="1"
                step="1"
                type="number"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-xs font-bold">
              TVA %
              <input
                value={form.taxRate}
                onChange={(event) => updateField("taxRate", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                min="0"
                max="100"
                step="0.01"
                type="number"
                required
              />
            </label>
            <label className="block text-xs font-bold">
              Stock initial
              <input
                value={form.quantity}
                onChange={(event) =>
                  updateField("quantity", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                min="0"
                step="1"
                type="number"
                required
              />
            </label>
            <label className="block text-xs font-bold">
              Alerte stock
              <input
                value={form.lowStockThreshold}
                onChange={(event) =>
                  updateField("lowStockThreshold", event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                min="0"
                step="1"
                type="number"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !businesses.length || !stores.length}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#08653e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Créer le produit
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Catalogue produits</h2>
            <p className="text-muted mt-1 text-xs">
              Produits actifs disponibles pour les boutiques de
              l&apos;entreprise.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f6f8f6] px-4 py-3">
              <p className="text-muted text-[10px] font-bold uppercase">
                Articles
              </p>
              <p className="mt-1 text-xl font-black">
                {filteredProducts.length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f6f8f6] px-4 py-3">
              <p className="text-muted text-[10px] font-bold uppercase">
                Stock total
              </p>
              <p className="mt-1 text-xl font-black">{totalStock}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="text-muted absolute top-1/2 left-4 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-[#dbe4dd] py-3 pr-4 pl-11 text-sm outline-none focus:border-[#0b7a4b]"
              placeholder="Rechercher par nom, SKU, code-barres..."
            />
          </label>
        </div>

        {lowStockCount > 0 && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            <AlertCircle className="size-4" />
            {lowStockCount} produit(s) sont au niveau d&apos;alerte stock.
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-2xl border border-[#e1e7e3]">
          <div className="text-muted hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.7fr_0.6fr] bg-[#f6f8f6] px-4 py-3 text-[10px] font-black uppercase lg:grid">
            <span>Produit</span>
            <span>Catégorie</span>
            <span>Prix</span>
            <span>Stock</span>
            <span>Statut</span>
            <span>Action</span>
          </div>
          <div className="divide-y divide-[#edf1ee]">
            {filteredProducts.map((product) => {
              const isLowStock =
                product.lowStockThreshold !== null &&
                product.totalStock <= product.lowStockThreshold;

              return (
                <article
                  key={product.id}
                  className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.7fr_0.6fr] lg:items-center"
                >
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-muted mt-1 text-xs">
                      {product.sku ?? "Sans SKU"}
                      {product.barcode ? ` · ${product.barcode}` : ""}
                    </p>
                  </div>
                  <p className="text-muted text-xs">
                    {product.categoryName ?? "Non classé"}
                  </p>
                  <div>
                    <p className="font-bold">{toMoney(product.sellingPrice)}</p>
                    <p className="text-muted text-[10px]">
                      Achat {toMoney(product.costPrice)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      isLowStock ? "text-amber-700" : "text-[#0b7a4b]",
                    )}
                  >
                    {product.totalStock} unité(s)
                  </p>
                  <span
                    className={cn(
                      "w-fit rounded-full px-3 py-1 text-[10px] font-black",
                      product.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {product.isActive ? "Actif" : "Inactif"}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectProduct(product)}
                    className={cn(
                      "flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black transition",
                      selectedProductId === product.id
                        ? "bg-[#0b7a4b] text-white"
                        : "bg-[#eef5f1] text-[#0b7a4b] hover:bg-[#dff0e7]",
                    )}
                  >
                    <Edit3 className="size-3.5" />
                    Gérer
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        {selectedProduct && editForm && (
          <div className="mt-6 grid gap-5 rounded-3xl border border-[#dbe4dd] bg-[#fbfcfb] p-5 xl:grid-cols-2">
            <form onSubmit={submitEdit} className="space-y-4">
              <div>
                <p className="text-sm font-black">Modifier le produit</p>
                <p className="text-muted mt-1 text-xs">
                  Les nouveaux prix seront utilisés dans les prochaines ventes.
                </p>
              </div>
              <label className="block text-xs font-bold">
                Nom
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    updateEditField("name", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold">
                  Catégorie
                  <input
                    value={editForm.categoryName}
                    onChange={(event) =>
                      updateEditField("categoryName", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  />
                </label>
                <label className="block text-xs font-bold">
                  SKU
                  <input
                    value={editForm.sku}
                    onChange={(event) =>
                      updateEditField("sku", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold">
                Code-barres
                <input
                  value={editForm.barcode}
                  onChange={(event) =>
                    updateEditField("barcode", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold">
                  Prix d&apos;achat
                  <input
                    value={editForm.costPrice}
                    onChange={(event) =>
                      updateEditField("costPrice", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    min="0"
                    step="1"
                    type="number"
                    required
                  />
                </label>
                <label className="block text-xs font-bold">
                  Prix de vente
                  <input
                    value={editForm.sellingPrice}
                    onChange={(event) =>
                      updateEditField("sellingPrice", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    min="1"
                    step="1"
                    type="number"
                    required
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold">
                  TVA %
                  <input
                    value={editForm.taxRate}
                    onChange={(event) =>
                      updateEditField("taxRate", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    min="0"
                    max="100"
                    step="0.01"
                    type="number"
                    required
                  />
                </label>
                <label className="block text-xs font-bold">
                  Alerte stock
                  <input
                    value={editForm.lowStockThreshold}
                    onChange={(event) =>
                      updateEditField("lowStockThreshold", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    min="0"
                    step="1"
                    type="number"
                    required
                  />
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 py-3 text-xs font-black text-white disabled:opacity-60"
                >
                  {isEditing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Enregistrer
                </button>
                {selectedProduct.isActive && (
                  <button
                    type="button"
                    onClick={deactivateProduct}
                    disabled={isDeactivating}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-xs font-black text-red-600 disabled:opacity-60"
                  >
                    {isDeactivating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PackageMinus className="size-4" />
                    )}
                    Désactiver
                  </button>
                )}
              </div>
            </form>

            <form onSubmit={submitStockAdjustment} className="space-y-4">
              <div>
                <p className="text-sm font-black">Ajuster le stock</p>
                <p className="text-muted mt-1 text-xs">
                  Utilisez une valeur positive pour ajouter, négative pour
                  retirer.
                </p>
              </div>
              <label className="block text-xs font-bold">
                Boutique
                <select
                  value={stockForm.storeId}
                  onChange={(event) =>
                    updateStockField("storeId", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                >
                  {selectedBusinessStoresForStock.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl bg-white p-4 text-xs">
                <p className="text-muted font-bold">Stock actuel</p>
                <p className="mt-1 text-2xl font-black">
                  {selectedStoreStock?.availableStock ?? 0} unité(s)
                </p>
                <p className="text-muted mt-1">
                  Réservé : {selectedStoreStock?.reservedQuantity ?? 0}
                </p>
              </div>
              <label className="block text-xs font-bold">
                Ajustement
                <input
                  value={stockForm.quantityDelta}
                  onChange={(event) =>
                    updateStockField("quantityDelta", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="Ex : 10 ou -2"
                  step="1"
                  type="number"
                  required
                />
              </label>
              <label className="block text-xs font-bold">
                Motif
                <input
                  value={stockForm.reason}
                  onChange={(event) =>
                    updateStockField("reason", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="Inventaire, casse, correction..."
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isAdjustingStock || !stockForm.storeId}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-5 py-3 text-xs font-black text-white disabled:opacity-60"
              >
                {isAdjustingStock && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Valider l&apos;ajustement
              </button>
            </form>
          </div>
        )}

        {!filteredProducts.length && (
          <div className="mt-6 rounded-3xl border border-dashed border-[#dbe4dd] bg-[#fbfcfb] p-8 text-center">
            <Store className="mx-auto size-8 text-[#0b7a4b]" />
            <p className="mt-3 text-sm font-bold">
              Aucun produit pour le moment
            </p>
            <p className="text-muted mt-1 text-xs">
              Créez votre premier article pour alimenter la caisse POS.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
