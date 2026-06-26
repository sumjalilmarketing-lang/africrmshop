import { redirect } from "next/navigation";
import {
  OwnerSuppliersClient,
  type OwnerStockReception,
  type OwnerSupplierBusiness,
  type OwnerSupplierItem,
  type OwnerSupplierProduct,
  type OwnerSupplierStore,
} from "@/components/owner/owner-suppliers-client";
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
  name: string;
  sku: string | null;
  cost_price: number;
};

type SupplierRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type StockMovementRow = {
  id: string;
  business_id: string;
  store_id: string;
  product_id: string;
  quantity_delta: number;
  unit_cost: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerSuppliersPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerSupplierBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

  const [storesResult, productsResult, suppliersResult, receptionsResult] =
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
            .select("id, business_id, name, sku, cost_price")
            .in("business_id", businessIds)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("name"),
          supabaseAdmin
            .from("suppliers")
            .select("id, business_id, name, phone, email, created_at")
            .in("business_id", businessIds)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabaseAdmin
            .from("stock_movements")
            .select(
              "id, business_id, store_id, product_id, quantity_delta, unit_cost, metadata, created_at",
            )
            .in("business_id", businessIds)
            .eq("movement_type", "purchase")
            .order("created_at", { ascending: false })
            .limit(30),
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
    suppliersResult.error ||
    receptionsResult.error
  ) {
    throw new Error(
      storesResult.error?.message ??
        productsResult.error?.message ??
        suppliersResult.error?.message ??
        receptionsResult.error?.message,
    );
  }

  const stores: OwnerSupplierStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
    city: store.city,
  }));
  const products: OwnerSupplierProduct[] = (
    (productsResult.data ?? []) as ProductRow[]
  ).map((product) => ({
    id: product.id,
    businessId: product.business_id,
    name: product.name,
    sku: product.sku,
    costPrice: toNumber(product.cost_price),
  }));
  const suppliers: OwnerSupplierItem[] = (
    (suppliersResult.data ?? []) as SupplierRow[]
  ).map((supplier) => ({
    id: supplier.id,
    businessId: supplier.business_id,
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email,
    createdAt: supplier.created_at,
  }));

  const storesById = new Map(stores.map((store) => [store.id, store.name]));
  const productsById = new Map(
    products.map((product) => [product.id, product.name]),
  );
  const suppliersById = new Map(
    suppliers.map((supplier) => [supplier.id, supplier.name]),
  );
  const receptions: OwnerStockReception[] = (
    (receptionsResult.data ?? []) as StockMovementRow[]
  ).map((movement) => {
    const supplierId =
      typeof movement.metadata?.supplier_id === "string"
        ? movement.metadata.supplier_id
        : null;
    const supplierName =
      (supplierId ? suppliersById.get(supplierId) : null) ??
      (typeof movement.metadata?.supplier_name === "string"
        ? movement.metadata.supplier_name
        : null);

    return {
      id: movement.id,
      businessId: movement.business_id,
      storeName: storesById.get(movement.store_id) ?? "Boutique",
      productName: productsById.get(movement.product_id) ?? "Produit",
      supplierName,
      quantity: toNumber(movement.quantity_delta),
      unitCost: toNumber(movement.unit_cost),
      reference:
        typeof movement.metadata?.reference === "string"
          ? movement.metadata.reference
          : null,
      createdAt: movement.created_at,
    };
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 10
        </p>
        <h1 className="mt-3 text-3xl font-black">Fournisseurs & stock</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Structurez vos achats : fournisseurs, réceptions et entrées de stock
          traçables pour alimenter la caisse.
        </p>
      </div>

      <OwnerSuppliersClient
        businesses={businesses}
        stores={stores}
        products={products}
        suppliers={suppliers}
        receptions={receptions}
      />
    </div>
  );
}
