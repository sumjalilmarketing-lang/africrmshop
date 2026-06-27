import { redirect } from "next/navigation";
import {
  OwnerSalesClient,
  type OwnerSaleBusiness,
  type OwnerSaleItem,
  type OwnerSaleLine,
  type OwnerSaleStore,
} from "@/components/owner/owner-sales-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type SaleMetadata = {
  tax_total?: number | string;
  cashier_user_id?: string;
  pos18?: {
    action?: "cancel" | "refund";
    reason?: string;
    restock?: boolean;
    processed_by?: string;
    processed_at?: string;
  };
};

type SaleRow = {
  id: string;
  business_id: string;
  store_id: string;
  customer_id: string | null;
  receipt_number: string | null;
  status: string;
  payment_status: string;
  subtotal: number | string;
  total_amount: number | string;
  paid_amount: number | string | null;
  created_at: string;
  metadata: SaleMetadata | null;
};

type SaleItemRow = {
  id: string;
  sale_id: string;
  product_name: string;
  sku: string | null;
  quantity: number | string;
  unit_price: number | string;
  tax_amount: number | string;
  line_total: number | string;
};

type PaymentRow = {
  sale_id: string;
  provider: string;
  provider_reference: string | null;
  amount: number | string;
  status: string;
  payment_methods: { name: string } | null;
};

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function getCustomerName(customer: CustomerRow | undefined) {
  if (!customer) return null;

  return (
    customer.company_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.phone ||
    customer.email ||
    null
  );
}

export default async function OwnerSalesPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerSaleBusiness[] = ownerBusinesses.map((business) => ({
    id: business.id,
    name: business.name,
  }));

  const [storesResult, salesResult] = businessIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("stores")
          .select("id, business_id, name")
          .in("business_id", businessIds)
          .is("deleted_at", null)
          .order("created_at"),
        supabaseAdmin
          .from("sales")
          .select(
            "id, business_id, store_id, customer_id, receipt_number, status, payment_status, subtotal, total_amount, paid_amount, created_at, metadata",
          )
          .in("business_id", businessIds)
          .in("status", ["completed", "cancelled", "refunded"])
          .order("created_at", { ascending: false })
          .limit(400),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (storesResult.error || salesResult.error) {
    throw new Error(storesResult.error?.message ?? salesResult.error?.message);
  }

  const stores: OwnerSaleStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const saleIds = saleRows.map((sale) => sale.id);
  const customerIds = [
    ...new Set(
      saleRows
        .map((sale) => sale.customer_id)
        .filter((customerId): customerId is string => Boolean(customerId)),
    ),
  ];

  const [saleItemsResult, paymentsResult, customersResult] = saleIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("sale_items")
          .select(
            "id, sale_id, product_name, sku, quantity, unit_price, tax_amount, line_total",
          )
          .in("sale_id", saleIds),
        supabaseAdmin
          .from("payments")
          .select(
            "sale_id, provider, provider_reference, amount, status, payment_methods(name)",
          )
          .in("sale_id", saleIds),
        customerIds.length
          ? supabaseAdmin
              .from("customers")
              .select("id, first_name, last_name, company_name, phone, email")
              .in("id", customerIds)
          : { data: [], error: null },
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (saleItemsResult.error || paymentsResult.error || customersResult.error) {
    throw new Error(
      saleItemsResult.error?.message ??
        paymentsResult.error?.message ??
        customersResult.error?.message,
    );
  }

  const saleLinesBySaleId = new Map<string, OwnerSaleLine[]>();
  for (const item of (saleItemsResult.data ?? []) as SaleItemRow[]) {
    saleLinesBySaleId.set(item.sale_id, [
      ...(saleLinesBySaleId.get(item.sale_id) ?? []),
      {
        id: item.id,
        productName: item.product_name,
        sku: item.sku,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unit_price),
        taxAmount: toNumber(item.tax_amount),
        lineTotal: toNumber(item.line_total),
      },
    ]);
  }

  const paymentsBySaleId = new Map(
    ((paymentsResult.data ?? []) as PaymentRow[]).map((payment) => [
      payment.sale_id,
      payment,
    ]),
  );
  const customersById = new Map(
    ((customersResult.data ?? []) as CustomerRow[]).map((customer) => [
      customer.id,
      customer,
    ]),
  );

  const sales: OwnerSaleItem[] = saleRows.map((sale) => {
    const payment = paymentsBySaleId.get(sale.id);
    const lines = saleLinesBySaleId.get(sale.id) ?? [];
    const taxTotal = lines.reduce((total, line) => total + line.taxAmount, 0);

    return {
      id: sale.id,
      businessId: sale.business_id,
      businessName: businessNames.get(sale.business_id) ?? "Entreprise",
      storeId: sale.store_id,
      storeName: storeNames.get(sale.store_id) ?? "Boutique",
      customerName: sale.customer_id
        ? getCustomerName(customersById.get(sale.customer_id))
        : null,
      receiptNumber: sale.receipt_number ?? "POS",
      status: sale.status,
      paymentStatus: sale.payment_status,
      paymentMethodName:
        payment?.payment_methods?.name ?? payment?.provider ?? "Paiement",
      paymentProvider: payment?.provider ?? null,
      paymentReference: payment?.provider_reference ?? null,
      paymentAmount: payment ? toNumber(payment.amount) : 0,
      subtotal: toNumber(sale.subtotal),
      taxTotal: taxTotal || toNumber(sale.metadata?.tax_total),
      totalAmount: toNumber(sale.total_amount),
      paidAmount: toNumber(sale.paid_amount),
      createdAt: sale.created_at,
      afterSaleAction: sale.metadata?.pos18?.action ?? null,
      afterSaleReason: sale.metadata?.pos18?.reason ?? null,
      afterSaleRestocked: sale.metadata?.pos18?.restock ?? null,
      afterSaleProcessedAt: sale.metadata?.pos18?.processed_at ?? null,
      lines,
    };
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 19
        </p>
        <h1 className="mt-3 text-3xl font-black">Historique des ventes</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Contrôlez les ventes encaissées, annulées et remboursées avec le
          détail des paiements et des actions après-vente.
        </p>
      </div>

      <OwnerSalesClient businesses={businesses} stores={stores} sales={sales} />
    </div>
  );
}
