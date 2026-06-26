import { redirect } from "next/navigation";
import {
  OwnerProductsClient,
  type OwnerProductBusiness,
  type OwnerProductListItem,
  type OwnerProductStore,
} from "@/components/owner/owner-products-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
  city: string | null;
};

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  low_stock_threshold: number | null;
  is_active: boolean;
};

type CategoryRow = {
  id: string;
  name: string;
};

type StockRow = {
  product_id: string;
  store_id: string;
  quantity: number;
  reserved_quantity: number;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerProductsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerProductBusiness[] = ownerBusinesses.map(
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
            .select("id, business_id, name, city")
            .in("business_id", businessIds)
            .eq("status", "active")
            .is("deleted_at", null)
            .order("created_at"),
          supabaseAdmin
            .from("products")
            .select(
              "id, business_id, category_id, name, sku, barcode, cost_price, selling_price, tax_rate, low_stock_threshold, is_active",
            )
            .in("business_id", businessIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("product_categories")
            .select("id, name")
            .in("business_id", businessIds)
            .is("deleted_at", null),
          supabaseAdmin
            .from("product_stock")
            .select("product_id, store_id, quantity, reserved_quantity")
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

  const categoriesById = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [
      category.id,
      category.name,
    ]),
  );
  const stockByProductId = new Map<string, number>();
  const stockRowsByProductId = new Map<string, StockRow[]>();
  for (const stock of (stocksResult.data ?? []) as StockRow[]) {
    stockByProductId.set(
      stock.product_id,
      (stockByProductId.get(stock.product_id) ?? 0) +
        Math.max(
          0,
          toNumber(stock.quantity) - toNumber(stock.reserved_quantity),
        ),
    );
    stockRowsByProductId.set(stock.product_id, [
      ...(stockRowsByProductId.get(stock.product_id) ?? []),
      stock,
    ]);
  }

  const stores: OwnerProductStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
    city: store.city,
  }));
  const storesById = new Map(stores.map((store) => [store.id, store]));

  const products: OwnerProductListItem[] = (
    (productsResult.data ?? []) as ProductRow[]
  ).map((product) => ({
    id: product.id,
    businessId: product.business_id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    categoryName: product.category_id
      ? (categoriesById.get(product.category_id) ?? null)
      : null,
    sellingPrice: toNumber(product.selling_price),
    costPrice: toNumber(product.cost_price),
    taxRate: toNumber(product.tax_rate),
    totalStock: stockByProductId.get(product.id) ?? 0,
    stockByStore: (stockRowsByProductId.get(product.id) ?? []).map((stock) => {
      const quantity = toNumber(stock.quantity);
      const reservedQuantity = toNumber(stock.reserved_quantity);
      return {
        storeId: stock.store_id,
        storeName: storesById.get(stock.store_id)?.name ?? "Boutique",
        quantity,
        reservedQuantity,
        availableStock: Math.max(0, quantity - reservedQuantity),
      };
    }),
    lowStockThreshold: product.low_stock_threshold,
    isActive: product.is_active,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 8
        </p>
        <h1 className="mt-3 text-3xl font-black">Catalogue produits</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Créez les articles, renseignez les prix et alimentez le stock initial
          pour que vos vendeurs puissent encaisser directement dans le POS.
        </p>
      </div>

      <OwnerProductsClient
        businesses={businesses}
        stores={stores}
        products={products}
      />
    </div>
  );
}
