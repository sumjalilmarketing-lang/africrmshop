import { redirect } from "next/navigation";
import {
  OwnerFinancialReportsClient,
  type OwnerFinancialBusiness,
  type OwnerFinancialReportRow,
  type OwnerFinancialStore,
} from "@/components/owner/owner-financial-reports-client";
import { getOwnerSession } from "@/lib/auth";
import { buildOwnerFinancialReportRows } from "@/lib/owner-financial-reports";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type SaleMetadata = {
  tax_total?: number | string;
};

type SaleRow = {
  id: string;
  business_id: string;
  store_id: string;
  status: string;
  subtotal: number | string;
  total_amount: number | string;
  created_at: string;
  metadata: SaleMetadata | null;
};

type SaleItemRow = {
  sale_id: string;
  tax_amount: number | string;
};

type PaymentRow = {
  sale_id: string;
  provider: string;
  amount: number | string;
  status: string;
};

type CashSessionRow = {
  id: string;
  business_id: string;
  store_id: string;
  closed_at: string | null;
  difference_amount: number | string | null;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerFinancialReportsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerFinancialBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

  const [storesResult, salesResult, cashSessionsResult] = businessIds.length
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
            "id, business_id, store_id, status, subtotal, total_amount, created_at, metadata",
          )
          .in("business_id", businessIds)
          .in("status", ["completed", "cancelled", "refunded"])
          .order("created_at", { ascending: false })
          .limit(1200),
        supabaseAdmin
          .from("cash_sessions")
          .select("id, business_id, store_id, closed_at, difference_amount")
          .in("business_id", businessIds)
          .eq("status", "closed")
          .not("closed_at", "is", null)
          .order("closed_at", { ascending: false })
          .limit(240),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (storesResult.error || salesResult.error || cashSessionsResult.error) {
    throw new Error(
      storesResult.error?.message ??
        salesResult.error?.message ??
        cashSessionsResult.error?.message,
    );
  }

  const stores: OwnerFinancialStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const saleIds = saleRows.map((sale) => sale.id);

  const [saleItemsResult, paymentsResult] = saleIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("sale_items")
          .select("sale_id, tax_amount")
          .in("sale_id", saleIds),
        supabaseAdmin
          .from("payments")
          .select("sale_id, provider, amount, status")
          .in("sale_id", saleIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (saleItemsResult.error || paymentsResult.error) {
    throw new Error(
      saleItemsResult.error?.message ?? paymentsResult.error?.message,
    );
  }

  const taxBySaleId = new Map<string, number>();
  for (const item of (saleItemsResult.data ?? []) as SaleItemRow[]) {
    taxBySaleId.set(
      item.sale_id,
      (taxBySaleId.get(item.sale_id) ?? 0) + toNumber(item.tax_amount),
    );
  }

  const dailyRows = buildOwnerFinancialReportRows({
    periodType: "day",
    sales: saleRows.map((sale) => ({
      id: sale.id,
      businessId: sale.business_id,
      storeId: sale.store_id,
      status: sale.status,
      subtotal: toNumber(sale.subtotal),
      taxTotal: taxBySaleId.get(sale.id) ?? toNumber(sale.metadata?.tax_total),
      totalAmount: toNumber(sale.total_amount),
      createdAt: sale.created_at,
    })),
    payments: ((paymentsResult.data ?? []) as PaymentRow[]).map((payment) => ({
      saleId: payment.sale_id,
      provider: payment.provider,
      amount: toNumber(payment.amount),
      status: payment.status,
    })),
    cashSessions: ((cashSessionsResult.data ?? []) as CashSessionRow[]).flatMap(
      (session) =>
        session.closed_at
          ? [
              {
                id: session.id,
                businessId: session.business_id,
                storeId: session.store_id,
                closedAt: session.closed_at,
                differenceAmount: toNumber(session.difference_amount),
              },
            ]
          : [],
    ),
  });
  const monthlyRows = buildOwnerFinancialReportRows({
    periodType: "month",
    sales: saleRows.map((sale) => ({
      id: sale.id,
      businessId: sale.business_id,
      storeId: sale.store_id,
      status: sale.status,
      subtotal: toNumber(sale.subtotal),
      taxTotal: taxBySaleId.get(sale.id) ?? toNumber(sale.metadata?.tax_total),
      totalAmount: toNumber(sale.total_amount),
      createdAt: sale.created_at,
    })),
    payments: ((paymentsResult.data ?? []) as PaymentRow[]).map((payment) => ({
      saleId: payment.sale_id,
      provider: payment.provider,
      amount: toNumber(payment.amount),
      status: payment.status,
    })),
    cashSessions: ((cashSessionsResult.data ?? []) as CashSessionRow[]).flatMap(
      (session) =>
        session.closed_at
          ? [
              {
                id: session.id,
                businessId: session.business_id,
                storeId: session.store_id,
                closedAt: session.closed_at,
                differenceAmount: toNumber(session.difference_amount),
              },
            ]
          : [],
    ),
  });
  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const enrichRow = (row: (typeof dailyRows)[number]) =>
    ({
      ...row,
      businessName: businessNames.get(row.businessId) ?? "Entreprise",
      storeName: storeNames.get(row.storeId) ?? "Boutique",
    }) satisfies OwnerFinancialReportRow;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 21
        </p>
        <h1 className="mt-3 text-3xl font-black">Reporting financier</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Analysez le chiffre d’affaires, la TVA, les remboursements, les
          paiements et les écarts de caisse par jour ou par mois.
        </p>
      </div>

      <OwnerFinancialReportsClient
        businesses={businesses}
        stores={stores}
        dailyRows={dailyRows.map(enrichRow)}
        monthlyRows={monthlyRows.map(enrichRow)}
      />
    </div>
  );
}
