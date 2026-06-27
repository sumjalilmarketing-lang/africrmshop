import { redirect } from "next/navigation";
import {
  OwnerAccountingClient,
  type OwnerAccountingBusiness,
  type OwnerAccountingEntry,
  type OwnerAccountingStore,
} from "@/components/owner/owner-accounting-client";
import { getOwnerSession } from "@/lib/auth";
import {
  buildAssistedAccountingEntries,
  type AssistedAccountingExpenseInput,
} from "@/lib/assisted-accounting";
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
  receipt_number: string | null;
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

type ExpenseRow = {
  id: string;
  business_id: string;
  store_id?: string | null;
  expense_number?: string | null;
  reference?: string | null;
  category?: string | null;
  description?: string | null;
  amount?: number | string | null;
  tax_amount?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;
  expense_date?: string | null;
  created_at?: string | null;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

async function fetchExpenses(businessIds: string[]) {
  if (businessIds.length === 0) return [] as ExpenseRow[];

  const preferred = await supabaseAdmin
    .from("expenses")
    .select(
      "id, business_id, store_id, expense_number, reference, category, description, amount, tax_amount, total_amount, status, expense_date, created_at",
    )
    .in("business_id", businessIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!preferred.error) return (preferred.data ?? []) as ExpenseRow[];

  const fallback = await supabaseAdmin
    .from("expenses")
    .select("id, business_id, amount, status, created_at")
    .in("business_id", businessIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (fallback.error) {
    console.warn("POS22: dépenses indisponibles pour le journal assisté", {
      preferred: preferred.error.message,
      fallback: fallback.error.message,
    });

    return [] as ExpenseRow[];
  }

  return (fallback.data ?? []) as ExpenseRow[];
}

export default async function OwnerAccountingPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerAccountingBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

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
            "id, business_id, store_id, receipt_number, status, subtotal, total_amount, created_at, metadata",
          )
          .in("business_id", businessIds)
          .in("status", ["completed", "cancelled", "refunded"])
          .order("created_at", { ascending: false })
          .limit(800),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (storesResult.error || salesResult.error) {
    throw new Error(storesResult.error?.message ?? salesResult.error?.message);
  }

  const stores: OwnerAccountingStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const saleIds = saleRows.map((sale) => sale.id);
  const [saleItemsResult, paymentsResult, expenseRows] = await Promise.all([
    saleIds.length
      ? supabaseAdmin
          .from("sale_items")
          .select("sale_id, tax_amount")
          .in("sale_id", saleIds)
      : { data: [], error: null },
    saleIds.length
      ? supabaseAdmin
          .from("payments")
          .select("sale_id, provider, amount, status")
          .in("sale_id", saleIds)
      : { data: [], error: null },
    fetchExpenses(businessIds),
  ]);

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

  const expenses: AssistedAccountingExpenseInput[] = expenseRows.map(
    (expense) => {
      const amount = toNumber(expense.total_amount ?? expense.amount);

      return {
        id: expense.id,
        businessId: expense.business_id,
        storeId: expense.store_id ?? null,
        reference: expense.expense_number ?? expense.reference ?? null,
        category: expense.category ?? expense.description ?? null,
        amount,
        taxAmount: toNumber(expense.tax_amount),
        status: expense.status ?? "draft",
        expenseDate: expense.expense_date ?? expense.created_at ?? "",
      };
    },
  );
  const entries = buildAssistedAccountingEntries({
    sales: saleRows.map((sale) => ({
      id: sale.id,
      businessId: sale.business_id,
      storeId: sale.store_id,
      receiptNumber: sale.receipt_number ?? "POS",
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
    expenses,
  });
  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const enrichedEntries: OwnerAccountingEntry[] = entries.map((entry) => ({
    ...entry,
    businessName: businessNames.get(entry.businessId) ?? "Entreprise",
    storeName: entry.storeId
      ? (storeNames.get(entry.storeId) ?? "Boutique")
      : "Non affecté",
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 22
        </p>
        <h1 className="mt-3 text-3xl font-black">Comptabilité assistée</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Préparez un journal comptable provisoire basé sur les ventes, la TVA,
          les remboursements, les paiements et les dépenses.
        </p>
      </div>

      <OwnerAccountingClient
        businesses={businesses}
        stores={stores}
        entries={enrichedEntries}
      />
    </div>
  );
}
