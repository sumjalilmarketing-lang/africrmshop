import { redirect } from "next/navigation";
import {
  OwnerInventoryClient,
  type OwnerInventoryBusiness,
  type OwnerInventoryRow,
  type OwnerInventoryStore,
} from "@/components/owner/owner-inventory-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

type StockRow = {
  store_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerInventoryPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerInventoryBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

  const [storesResult, productsResult, categoriesResult, stocksResult] =
    businessIds.length
      ? await Promise.all([
          supabaseAdmin
            .from("stores")
            .select("id, business_id, name")
            .in("business_id", businessIds)
            .eq("status", "active")
            .is("deleted_at", null)
            .order("created_at"),
          supabaseAdmin
            .from("products")
            .select(
              "id, business_id, category_id, name, sku, cost_price, selling_price, low_stock_threshold",
            )
            .in("business_id", businessIds)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("name"),
          supabaseAdmin
            .from("product_categories")
            .select("id, name")
            .in("business_id", businessIds)
            .eq("is_active", true)
            .is("deleted_at", null),
          supabaseAdmin
            .from("product_stock")
            .select("store_id, product_id, quantity, reserved_quantity")
            .in("business_id", businessIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (
    storesResult.error ||
    productsResult.error ||
    categoriesResult.error ||
    stocksResult.error
  ) {
    throw new Error(
      storesResult.error?.message ??
        productsResult.error?.message ??
        categoriesResult.error?.message ??
        stocksResult.error?.message,
    );
  }

  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const stores: OwnerInventoryStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const categoriesById = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [
      category.id,
      category.name,
    ]),
  );
  const stockByStoreProduct = new Map(
    ((stocksResult.data ?? []) as StockRow[]).map((stock) => [
      `${stock.store_id}:${stock.product_id}`,
      stock,
    ]),
  );

  const rows: OwnerInventoryRow[] = [];
  for (const product of (productsResult.data ?? []) as ProductRow[]) {
    const productStores = stores.filter(
      (store) => store.businessId === product.business_id,
    );

    for (const store of productStores) {
      const stock = stockByStoreProduct.get(`${store.id}:${product.id}`);
      const quantity = toNumber(stock?.quantity);
      const reservedQuantity = toNumber(stock?.reserved_quantity);

      rows.push({
        id: `${store.id}:${product.id}`,
        businessId: product.business_id,
        businessName: businessNames.get(product.business_id) ?? "Entreprise",
        storeId: store.id,
        storeName: store.name,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        categoryName: product.category_id
          ? (categoriesById.get(product.category_id) ?? null)
          : null,
        costPrice: toNumber(product.cost_price),
        sellingPrice: toNumber(product.selling_price),
        quantity,
        reservedQuantity,
        availableStock: Math.max(0, quantity - reservedQuantity),
        lowStockThreshold: product.low_stock_threshold ?? 0,
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 11
        </p>
        <h1 className="mt-3 text-3xl font-black">Inventaire & alertes</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Pilotez le stock disponible, les ruptures, les seuils d&apos;alerte et
          la valeur d&apos;inventaire de chaque boutique.
        </p>
      </div>

      <OwnerInventoryClient
        businesses={businesses}
        stores={stores}
        rows={rows}
      />
    </div>
  );
}
