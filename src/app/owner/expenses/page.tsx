import { redirect } from "next/navigation";
import {
  OwnerExpensesClient,
  type OwnerExpenseBusiness,
  type OwnerExpenseDocument,
  type OwnerExpenseItem,
  type OwnerExpenseStore,
} from "@/components/owner/owner-expenses-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type ExpenseRow = {
  id: string;
  business_id: string;
  store_id: string | null;
  expense_number: string | null;
  category: string | null;
  description: string | null;
  status: string;
  amount_excluding_tax: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  currency_code: string | null;
  expense_date: string;
  due_date: string | null;
  paid_at: string | null;
  reference: string | null;
  created_at: string;
};

type ExpenseDocumentRow = {
  id: string;
  expense_id: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | string | null;
  created_at: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerExpensesPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerExpenseBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

  const [storesResult, expensesResult] = businessIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("stores")
          .select("id, business_id, name")
          .in("business_id", businessIds)
          .is("deleted_at", null)
          .order("created_at"),
        supabaseAdmin
          .from("expenses")
          .select(
            "id, business_id, store_id, expense_number, category, description, status, amount_excluding_tax, tax_amount, total_amount, currency_code, expense_date, due_date, paid_at, reference, created_at",
          )
          .in("business_id", businessIds)
          .order("expense_date", { ascending: false })
          .limit(500),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (storesResult.error || expensesResult.error) {
    throw new Error(
      storesResult.error?.message ?? expensesResult.error?.message,
    );
  }

  const stores: OwnerExpenseStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const expenseRows = (expensesResult.data ?? []) as ExpenseRow[];
  const expenseIds = expenseRows.map((expense) => expense.id);
  const documentsResult = expenseIds.length
    ? await supabaseAdmin
        .from("expense_documents")
        .select(
          "id, expense_id, file_name, storage_bucket, storage_path, mime_type, file_size, created_at",
        )
        .in("expense_id", expenseIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  const documentRows = (documentsResult.data ?? []) as ExpenseDocumentRow[];
  const documents: OwnerExpenseDocument[] = await Promise.all(
    documentRows.map(async (document) => {
      const signedUrlResult = await supabaseAdmin.storage
        .from(document.storage_bucket)
        .createSignedUrl(document.storage_path, 60 * 60);

      return {
        id: document.id,
        expenseId: document.expense_id,
        fileName: document.file_name,
        mimeType: document.mime_type,
        fileSize: toNumber(document.file_size),
        createdAt: document.created_at,
        downloadUrl: signedUrlResult.data?.signedUrl ?? null,
      };
    }),
  );
  const documentCountsByExpenseId = new Map<string, number>();
  for (const document of documentRows) {
    documentCountsByExpenseId.set(
      document.expense_id,
      (documentCountsByExpenseId.get(document.expense_id) ?? 0) + 1,
    );
  }
  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const expenses: OwnerExpenseItem[] = expenseRows.map((expense) => ({
    id: expense.id,
    businessId: expense.business_id,
    businessName: businessNames.get(expense.business_id) ?? "Entreprise",
    storeId: expense.store_id,
    storeName: expense.store_id
      ? (storeNames.get(expense.store_id) ?? "Boutique")
      : "Non affecté",
    expenseNumber: expense.expense_number ?? "Dépense",
    category: expense.category ?? "Général",
    description: expense.description,
    status: expense.status,
    amountExcludingTax: toNumber(expense.amount_excluding_tax),
    taxAmount: toNumber(expense.tax_amount),
    totalAmount: toNumber(expense.total_amount),
    currencyCode: expense.currency_code ?? "XOF",
    expenseDate: expense.expense_date,
    dueDate: expense.due_date,
    paidAt: expense.paid_at,
    reference: expense.reference,
    documentCount: documentCountsByExpenseId.get(expense.id) ?? 0,
    createdAt: expense.created_at,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 23
        </p>
        <h1 className="mt-3 text-3xl font-black">Dépenses</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Enregistrez, catégorisez, contrôlez et validez les dépenses avec TVA
          et suivi des justificatifs.
        </p>
      </div>

      <OwnerExpensesClient
        businesses={businesses}
        stores={stores}
        expenses={expenses}
        documents={documents}
      />
    </div>
  );
}
