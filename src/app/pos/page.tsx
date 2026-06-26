import { redirect } from "next/navigation";
import {
  PosRegister,
  type PosCustomer,
  type PosPaymentMethod,
  type PosRecentSale,
  type PosRegisterProduct,
  type PosRegisterStore,
} from "@/components/pos/pos-register";
import { getAppSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  city: string | null;
  businesses: { name: string; status: string } | null;
};

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  selling_price: number;
  tax_rate: number;
  track_inventory: boolean;
  low_stock_threshold: number | null;
};

type StockRow = {
  store_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
};

type PaymentMethodRow = {
  id: string;
  business_id: string;
  name: string;
  code: string;
  provider: string;
  requires_reference: boolean;
};

type SaleRow = {
  id: string;
  business_id: string;
  store_id: string;
  customer_id: string | null;
  receipt_number: string | null;
  subtotal: number;
  total_amount: number;
  created_at: string;
  metadata: { tax_total?: number } | null;
};

type CustomerRow = {
  id: string;
  business_id: string;
  customer_code: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_points: number | string | null;
  created_at: string;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
};

type PaymentRow = {
  sale_id: string;
  provider: string;
  provider_reference: string | null;
  payment_methods: { name: string } | null;
};

function getAccessibleStoreIds(
  session: Awaited<ReturnType<typeof getAppSession>>,
) {
  if (!session) return [];

  const scopedStoreIds = session.permissionScopes
    .filter((scope) => scope.permissions.includes("pos.access"))
    .flatMap((scope) => (scope.storeId ? [scope.storeId] : []));

  return [...new Set(scopedStoreIds)];
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function PosPage() {
  const session = await getAppSession();
  if (!session) redirect("/connexion");
  if (session.mustChangePassword) redirect("/changer-mot-de-passe");

  const canAccessPos = hasPermission(session, "pos.access");
  if (!canAccessPos) redirect(session.defaultRoute);

  const accessibleStoreIds = getAccessibleStoreIds(session);
  const canSeeAllOwnedStores = session.isOwner || session.isSuperAdmin;
  const ownedBusinessIds = session.ownerships.map(
    (ownership) => ownership.businessId,
  );

  const storesQuery = supabaseAdmin
    .from("stores")
    .select("id, business_id, name, code, city, businesses(name, status)")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at");

  const storesResult =
    canSeeAllOwnedStores && ownedBusinessIds.length > 0
      ? await storesQuery.in("business_id", ownedBusinessIds)
      : accessibleStoreIds.length > 0
        ? await storesQuery.in("id", accessibleStoreIds)
        : { data: [], error: null };

  if (storesResult.error) throw new Error(storesResult.error.message);

  const storeRows = (storesResult.data ?? []) as StoreRow[];
  const stores: PosRegisterStore[] = storeRows.map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
    code: store.code,
    city: store.city,
    businessName: store.businesses?.name ?? "Entreprise",
  }));
  const storeIds = stores.map((store) => store.id);
  const businessIds = [...new Set(stores.map((store) => store.businessId))];

  const [
    productsResult,
    stocksResult,
    categoriesResult,
    paymentsResult,
    customersResult,
    salesResult,
  ] =
    businessIds.length > 0
      ? await Promise.all([
          supabaseAdmin
            .from("products")
            .select(
              "id, business_id, category_id, name, sku, barcode, selling_price, tax_rate, track_inventory, low_stock_threshold",
            )
            .in("business_id", businessIds)
            .eq("is_active", true)
            .is("deleted_at", null)
            .order("name"),
          storeIds.length > 0
            ? supabaseAdmin
                .from("product_stock")
                .select("store_id, product_id, quantity, reserved_quantity")
                .in("store_id", storeIds)
            : { data: [], error: null },
          supabaseAdmin
            .from("product_categories")
            .select("id, name, color")
            .in("business_id", businessIds)
            .eq("is_active", true)
            .is("deleted_at", null),
          supabaseAdmin
            .from("payment_methods")
            .select("id, business_id, name, code, provider, requires_reference")
            .in("business_id", businessIds)
            .eq("is_enabled", true)
            .order("display_order"),
          supabaseAdmin
            .from("customers")
            .select(
              "id, business_id, customer_code, first_name, last_name, company_name, email, phone, loyalty_points, created_at",
            )
            .in("business_id", businessIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(300),
          storeIds.length > 0
            ? supabaseAdmin
                .from("sales")
                .select(
                  "id, business_id, store_id, customer_id, receipt_number, subtotal, total_amount, created_at, metadata",
                )
                .in("store_id", storeIds)
                .eq("status", "completed")
                .order("created_at", { ascending: false })
                .limit(100)
            : { data: [], error: null },
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (
    productsResult.error ||
    stocksResult.error ||
    categoriesResult.error ||
    paymentsResult.error ||
    customersResult.error ||
    salesResult.error
  ) {
    throw new Error(
      productsResult.error?.message ??
        stocksResult.error?.message ??
        categoriesResult.error?.message ??
        paymentsResult.error?.message ??
        customersResult.error?.message ??
        salesResult.error?.message,
    );
  }

  const categoriesById = new Map(
    ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => [
      category.id,
      category,
    ]),
  );
  const stockByStoreProduct = new Map(
    ((stocksResult.data ?? []) as StockRow[]).map((stock) => [
      `${stock.store_id}:${stock.product_id}`,
      stock,
    ]),
  );
  const products: PosRegisterProduct[] = [];

  for (const store of stores) {
    const storeProducts = ((productsResult.data ?? []) as ProductRow[]).filter(
      (product) => product.business_id === store.businessId,
    );

    for (const product of storeProducts) {
      const stock = stockByStoreProduct.get(`${store.id}:${product.id}`);
      const category = product.category_id
        ? categoriesById.get(product.category_id)
        : null;
      const quantity = toNumber(stock?.quantity);
      const reservedQuantity = toNumber(stock?.reserved_quantity);

      products.push({
        id: product.id,
        storeId: store.id,
        businessId: product.business_id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
        unitPrice: toNumber(product.selling_price),
        taxRate: toNumber(product.tax_rate),
        trackInventory: product.track_inventory,
        availableStock: Math.max(0, quantity - reservedQuantity),
        lowStockThreshold: product.low_stock_threshold,
      });
    }
  }

  const paymentMethods: PosPaymentMethod[] = (
    (paymentsResult.data ?? []) as PaymentMethodRow[]
  ).map((method) => ({
    id: method.id,
    businessId: method.business_id,
    name: method.name,
    code: method.code,
    provider: method.provider,
    requiresReference: method.requires_reference,
  }));
  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const customerStats = new Map<
    string,
    { totalSpent: number; saleCount: number; lastSaleAt: string | null }
  >();
  for (const sale of saleRows) {
    if (!sale.customer_id) continue;
    const current = customerStats.get(sale.customer_id) ?? {
      totalSpent: 0,
      saleCount: 0,
      lastSaleAt: null,
    };
    customerStats.set(sale.customer_id, {
      totalSpent: current.totalSpent + toNumber(sale.total_amount),
      saleCount: current.saleCount + 1,
      lastSaleAt:
        !current.lastSaleAt || sale.created_at > current.lastSaleAt
          ? sale.created_at
          : current.lastSaleAt,
    });
  }
  const customersById = new Map<string, PosCustomer>();
  const customers: PosCustomer[] = (
    (customersResult.data ?? []) as CustomerRow[]
  ).map((customer) => {
    const name =
      customer.company_name ||
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      customer.phone ||
      customer.email ||
      "Client";
    const stats = customerStats.get(customer.id) ?? {
      totalSpent: 0,
      saleCount: 0,
      lastSaleAt: null,
    };
    const item = {
      id: customer.id,
      businessId: customer.business_id,
      code: customer.customer_code,
      name,
      phone: customer.phone,
      email: customer.email,
      loyaltyPoints: toNumber(customer.loyalty_points),
      totalSpent: stats.totalSpent,
      saleCount: stats.saleCount,
      lastSaleAt: stats.lastSaleAt,
    };
    customersById.set(customer.id, item);
    return item;
  });
  const saleIds = saleRows.map((sale) => sale.id);
  const [saleItemsResult, salePaymentsResult] =
    saleIds.length > 0
      ? await Promise.all([
          supabaseAdmin
            .from("sale_items")
            .select(
              "id, sale_id, product_id, product_name, sku, quantity, unit_price, tax_rate, tax_amount, line_total",
            )
            .in("sale_id", saleIds),
          supabaseAdmin
            .from("payments")
            .select(
              "sale_id, provider, provider_reference, payment_methods(name)",
            )
            .in("sale_id", saleIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (saleItemsResult.error || salePaymentsResult.error) {
    throw new Error(
      saleItemsResult.error?.message ?? salePaymentsResult.error?.message,
    );
  }

  const storesById = new Map(stores.map((store) => [store.id, store]));
  const saleItemsBySaleId = new Map<string, SaleItemRow[]>();
  for (const item of (saleItemsResult.data ?? []) as SaleItemRow[]) {
    saleItemsBySaleId.set(item.sale_id, [
      ...(saleItemsBySaleId.get(item.sale_id) ?? []),
      item,
    ]);
  }

  const paymentsBySaleId = new Map(
    ((salePaymentsResult.data ?? []) as PaymentRow[]).map((payment) => [
      payment.sale_id,
      payment,
    ]),
  );
  const recentSales: PosRecentSale[] = saleRows.map((sale) => {
    const store = storesById.get(sale.store_id);
    const payment = paymentsBySaleId.get(sale.id);
    const customer = sale.customer_id
      ? customersById.get(sale.customer_id)
      : null;
    const lines = (saleItemsBySaleId.get(sale.id) ?? []).map((item) => ({
      id: item.id,
      name: item.product_name,
      sku: item.sku,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
      taxRate: toNumber(item.tax_rate),
      taxAmount: toNumber(item.tax_amount),
      lineTotal: toNumber(item.line_total),
    }));
    const taxTotal = lines.reduce((total, line) => total + line.taxAmount, 0);

    return {
      id: sale.id,
      receiptNumber: sale.receipt_number ?? "POS",
      storeId: sale.store_id,
      storeName: store?.name ?? "Point de vente",
      businessName: store?.businessName ?? "AFRICRM Shop",
      createdAt: sale.created_at,
      paymentMethodName:
        payment?.payment_methods?.name ?? payment?.provider ?? "Paiement",
      paymentReference: payment?.provider_reference ?? null,
      customerName: customer?.name ?? null,
      subtotal: toNumber(sale.subtotal),
      taxTotal: taxTotal || toNumber(sale.metadata?.tax_total),
      total: toNumber(sale.total_amount),
      lines,
    };
  });

  return (
    <PosRegister
      stores={stores}
      products={products}
      paymentMethods={paymentMethods}
      customers={customers}
      recentSales={recentSales}
    />
  );
}
