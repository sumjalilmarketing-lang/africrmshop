import { redirect } from "next/navigation";
import {
  OwnerTaxReportsClient,
  type OwnerTaxBusiness,
  type OwnerTaxReportRow,
  type OwnerTaxStore,
} from "@/components/owner/owner-tax-reports-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { buildOwnerTaxReportRows } from "@/lib/owner-tax-reports";
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

type ExpenseRow = {
  id: string;
  business_id: string;
  store_id: string | null;
  status: string;
  amount_excluding_tax: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  expense_date: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerTaxReportsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerTaxBusiness[] = ownerBusinesses.map((business) => ({
    id: business.id,
    name: business.name,
  }));

  const [storesResult, salesResult, expensesResult] = businessIds.length
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
          .limit(1500),
        supabaseAdmin
          .from("expenses")
          .select(
            "id, business_id, store_id, status, amount_excluding_tax, tax_amount, total_amount, expense_date",
          )
          .in("business_id", businessIds)
          .in("status", ["approved", "paid", "rejected", "cancelled"])
          .order("expense_date", { ascending: false })
          .limit(1000),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (storesResult.error || salesResult.error || expensesResult.error) {
    throw new Error(
      storesResult.error?.message ??
        salesResult.error?.message ??
        expensesResult.error?.message,
    );
  }

  const stores: OwnerTaxStore[] = ((storesResult.data ?? []) as StoreRow[]).map(
    (store) => ({
      id: store.id,
      businessId: store.business_id,
      name: store.name,
    }),
  );
  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const saleIds = saleRows.map((sale) => sale.id);
  const saleItemsResult = saleIds.length
    ? await supabaseAdmin
        .from("sale_items")
        .select("sale_id, tax_amount")
        .in("sale_id", saleIds)
    : { data: [], error: null };

  if (saleItemsResult.error) {
    throw new Error(saleItemsResult.error.message);
  }

  const taxBySaleId = new Map<string, number>();
  for (const item of (saleItemsResult.data ?? []) as SaleItemRow[]) {
    taxBySaleId.set(
      item.sale_id,
      (taxBySaleId.get(item.sale_id) ?? 0) + toNumber(item.tax_amount),
    );
  }

  const sales = saleRows.map((sale) => ({
    id: sale.id,
    businessId: sale.business_id,
    storeId: sale.store_id,
    status: sale.status,
    subtotal: toNumber(sale.subtotal),
    taxTotal: taxBySaleId.get(sale.id) ?? toNumber(sale.metadata?.tax_total),
    totalAmount: toNumber(sale.total_amount),
    createdAt: sale.created_at,
  }));
  const expenses = ((expensesResult.data ?? []) as ExpenseRow[]).map(
    (expense) => ({
      id: expense.id,
      businessId: expense.business_id,
      storeId: expense.store_id,
      status: expense.status,
      amountExcludingTax: toNumber(expense.amount_excluding_tax),
      taxAmount: toNumber(expense.tax_amount),
      totalAmount: toNumber(expense.total_amount),
      expenseDate: expense.expense_date,
    }),
  );
  const monthlyRows = buildOwnerTaxReportRows({
    periodType: "month",
    sales,
    expenses,
  });
  const quarterlyRows = buildOwnerTaxReportRows({
    periodType: "quarter",
    sales,
    expenses,
  });
  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const enrichRow = (row: (typeof monthlyRows)[number]) =>
    ({
      ...row,
      businessName: businessNames.get(row.businessId) ?? "Entreprise",
      storeName: row.storeId
        ? (storeNames.get(row.storeId) ?? "Boutique")
        : "Non affectée",
    }) satisfies OwnerTaxReportRow;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 25
        </p>
        <h1 className="mt-3 text-3xl font-black">TVA & fiscalité</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Préparez les montants fiscaux utiles à partir des ventes, avoirs,
          remboursements et dépenses déductibles.
        </p>
      </div>

      <OwnerTaxReportsClient
        businesses={businesses}
        stores={stores}
        monthlyRows={monthlyRows.map(enrichRow)}
        quarterlyRows={quarterlyRows.map(enrichRow)}
      />
    </div>
  );
}
