"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import { buildOwnerExpensesSummary } from "@/lib/owner-expenses-summary";
import { cn } from "@/lib/utils";

export type OwnerExpenseBusiness = {
  id: string;
  name: string;
};

export type OwnerExpenseStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerExpenseDocument = {
  id: string;
  expenseId: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number;
  createdAt: string;
  downloadUrl: string | null;
};

export type OwnerExpenseItem = {
  id: string;
  businessId: string;
  businessName: string;
  storeId: string | null;
  storeName: string;
  expenseNumber: string;
  category: string;
  description: string | null;
  status: string;
  amountExcludingTax: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  expenseDate: string;
  dueDate: string | null;
  paidAt: string | null;
  reference: string | null;
  documentCount: number;
  createdAt: string;
};

type ExpenseForm = {
  businessId: string;
  storeId: string;
  category: string;
  description: string;
  reference: string;
  amountExcludingTax: string;
  taxAmount: string;
  expenseDate: string;
  dueDate: string;
  status: "draft" | "pending";
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  pending: "À valider",
  approved: "Approuvée",
  rejected: "Rejetée",
  paid: "Payée",
  cancelled: "Annulée",
};

const statusClasses: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  paid: "bg-[#e9f5ee] text-[#0b7a4b]",
  cancelled: "bg-slate-100 text-slate-600",
};

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;

  return `${(value / 1024 / 1024).toFixed(1)} Mo`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(businessId: string): ExpenseForm {
  return {
    businessId,
    storeId: "",
    category: "Achats",
    description: "",
    reference: "",
    amountExcludingTax: "",
    taxAmount: "0",
    expenseDate: today(),
    dueDate: "",
    status: "draft",
  };
}

function getSafeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OwnerExpensesClient({
  businesses,
  stores,
  expenses,
  documents,
}: Readonly<{
  businesses: OwnerExpenseBusiness[];
  stores: OwnerExpenseStore[];
  expenses: OwnerExpenseItem[];
  documents: OwnerExpenseDocument[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState(
    expenses[0]?.id ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [form, setForm] = useState<ExpenseForm>(() =>
    createInitialForm(businesses[0]?.id ?? ""),
  );

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const formStores = stores.filter(
    (store) => store.businessId === form.businessId,
  );
  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      if (businessId && expense.businessId !== businessId) return false;
      if (storeId !== "all" && expense.storeId !== storeId) return false;
      if (status !== "all" && expense.status !== status) return false;
      if (!normalizedSearch) return true;

      return [
        expense.expenseNumber,
        expense.category,
        expense.description,
        expense.reference,
        expense.businessName,
        expense.storeName,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [businessId, expenses, search, status, storeId]);
  const selectedExpense =
    filteredExpenses.find((expense) => expense.id === selectedExpenseId) ??
    filteredExpenses[0] ??
    null;
  const selectedExpenseDocuments = selectedExpense
    ? documents.filter((document) => document.expenseId === selectedExpense.id)
    : [];
  const expensesSummary = useMemo(
    () => buildOwnerExpensesSummary(filteredExpenses),
    [filteredExpenses],
  );
  const formTotal =
    Number(form.amountExcludingTax || 0) + Number(form.taxAmount || 0);

  function updateForm<K extends keyof ExpenseForm>(
    field: K,
    value: ExpenseForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "businessId" ? { storeId: "" } : {}),
    }));
  }

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
    setSelectedExpenseId("");
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);
    const response = await fetch("/api/owner/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    setIsSubmitting(false);

    if (!response) {
      setMessage({ type: "error", text: "Serveur dépenses indisponible." });
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setMessage({
        type: "error",
        text: payload?.error ?? "La dépense n'a pas pu être enregistrée.",
      });
      return;
    }

    setMessage({ type: "success", text: "Dépense enregistrée avec succès." });
    setForm(createInitialForm(form.businessId));
    window.location.reload();
  }

  async function runExpenseAction(
    expenseId: string,
    action: "submit" | "approve" | "reject" | "mark_paid" | "cancel",
  ) {
    if (isActionLoading) return;

    setIsActionLoading(true);
    setMessage(null);
    const response = await fetch(`/api/owner/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rejectionReason:
          action === "reject" ? "Rejetée depuis le contrôle Owner." : undefined,
      }),
    }).catch(() => null);
    setIsActionLoading(false);

    if (!response) {
      setMessage({ type: "error", text: "Serveur dépenses indisponible." });
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setMessage({
        type: "error",
        text: payload?.error ?? "La dépense n'a pas pu être mise à jour.",
      });
      return;
    }

    setMessage({ type: "success", text: "Statut dépense mis à jour." });
    window.location.reload();
  }

  async function uploadExpenseDocument(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!selectedExpense || !documentFile || isDocumentUploading) return;

    const formData = new FormData();
    formData.append("file", documentFile);
    setIsDocumentUploading(true);
    setMessage(null);

    const response = await fetch(
      `/api/owner/expenses/${selectedExpense.id}/documents`,
      {
        method: "POST",
        body: formData,
      },
    ).catch(() => null);
    setIsDocumentUploading(false);

    if (!response) {
      setMessage({
        type: "error",
        text: "Serveur justificatifs indisponible.",
      });
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setMessage({
        type: "error",
        text: payload?.error ?? "Le justificatif n'a pas pu être envoyé.",
      });
      return;
    }

    setMessage({ type: "success", text: "Justificatif ajouté avec succès." });
    setDocumentFile(null);
    window.location.reload();
  }

  function exportExpenses() {
    const selectedBusiness =
      businesses.find((business) => business.id === businessId)?.name ??
      "toutes-entreprises";

    downloadCsvFile(
      [
        "africrm-depenses",
        getSafeFilePart(selectedBusiness),
        status === "all" ? "tous-statuts" : status,
      ].join("-"),
      [
        [
          "Numero",
          "Date",
          "Entreprise",
          "Boutique",
          "Categorie",
          "Description",
          "Reference",
          "Statut",
          "HT",
          "TVA",
          "TTC",
          "Justificatifs",
        ],
        ...filteredExpenses.map((expense) => [
          expense.expenseNumber,
          expense.expenseDate,
          expense.businessName,
          expense.storeName,
          expense.category,
          expense.description ?? "",
          expense.reference ?? "",
          statusLabels[expense.status] ?? expense.status,
          expense.amountExcludingTax,
          expense.taxAmount,
          expense.totalAmount,
          expense.documentCount,
        ]),
      ],
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Dépenses</p>
            <ReceiptText className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(expensesSummary.totalExpenses)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {expensesSummary.expenseCount} ligne(s)
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Conformité</p>
            <ShieldCheck
              className={cn(
                "size-5",
                expensesSummary.documentComplianceRate >= 80
                  ? "text-[#0b7a4b]"
                  : expensesSummary.documentComplianceRate >= 50
                    ? "text-amber-600"
                    : "text-red-700",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {expensesSummary.documentComplianceRate}%
          </p>
          <p className="text-muted mt-1 text-xs">
            {expensesSummary.missingDocumentCount} sans justificatif
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">TVA</p>
            <FileText className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(expensesSummary.totalTax)}
          </p>
          <p className="text-muted mt-1 text-xs">potentiellement récupérable</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">À valider</p>
            <Clock3 className="size-5 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {expensesSummary.pendingCount}
          </p>
          <p className="text-muted mt-1 text-xs">
            {expensesSummary.draftCount} brouillon(s)
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Payées</p>
            <CheckCircle2 className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {expensesSummary.paidCount}
          </p>
          <p className="text-muted mt-1 text-xs">
            contrôle {expensesSummary.approvalRate}%
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <form
          onSubmit={submitExpense}
          className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black">Nouvelle dépense</h2>
              <p className="text-muted mt-1 text-xs">
                Montant HT + TVA = total TTC.
              </p>
            </div>
            <Plus className="size-5 text-[#0b7a4b]" />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold">
              Entreprise
              <select
                value={form.businessId}
                onChange={(event) =>
                  updateForm("businessId", event.target.value)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
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
              Boutique
              <select
                value={form.storeId}
                onChange={(event) => updateForm("storeId", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="">Non affectée</option>
                {formStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-bold">
                Catégorie
                <input
                  value={form.category}
                  onChange={(event) =>
                    updateForm("category", event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                />
              </label>
              <label className="block text-xs font-bold">
                Référence
                <input
                  value={form.reference}
                  onChange={(event) =>
                    updateForm("reference", event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="Facture, reçu..."
                />
              </label>
            </div>
            <label className="block text-xs font-bold">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                rows={3}
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-bold">
                Montant HT
                <input
                  type="number"
                  min="0"
                  value={form.amountExcludingTax}
                  onChange={(event) =>
                    updateForm("amountExcludingTax", event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                />
              </label>
              <label className="block text-xs font-bold">
                TVA
                <input
                  type="number"
                  min="0"
                  value={form.taxAmount}
                  onChange={(event) =>
                    updateForm("taxAmount", event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-bold">
                Date dépense
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) =>
                    updateForm("expenseDate", event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                  required
                />
              </label>
              <label className="block text-xs font-bold">
                Échéance
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    updateForm("dueDate", event.target.value)
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                />
              </label>
            </div>
            <label className="block text-xs font-bold">
              Statut initial
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm(
                    "status",
                    event.target.value as "draft" | "pending",
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="draft">Brouillon</option>
                <option value="pending">À valider</option>
              </select>
            </label>

            <div className="rounded-2xl bg-[#f8fbf9] p-4 text-sm">
              <span className="text-muted block text-xs font-bold">
                Total TTC
              </span>
              <strong className="mt-1 block text-xl">
                {formatMoney(formTotal)}
              </strong>
            </div>

            {message ? (
              <p
                className={cn(
                  "rounded-2xl px-4 py-3 text-xs font-bold",
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700",
                )}
              >
                {message.text}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !form.businessId}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Enregistrer la dépense
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
            <div className="grid gap-3 md:grid-cols-5">
              <label className="block text-xs font-bold">
                Entreprise
                <select
                  value={businessId}
                  onChange={(event) => changeBusiness(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold">
                Boutique
                <select
                  value={storeId}
                  onChange={(event) => setStoreId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                >
                  <option value="all">Toutes</option>
                  {filteredStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold">
                Statut
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
                >
                  <option value="all">Tous</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="relative block text-xs font-bold">
                Recherche
                <Search className="absolute bottom-4 left-4 size-4 text-[#68736c]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white pr-4 pl-11 text-sm outline-none focus:border-[#0b7a4b]"
                  placeholder="Catégorie..."
                />
              </label>
              <button
                type="button"
                onClick={exportExpenses}
                disabled={filteredExpenses.length === 0}
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 md:mt-[1.625rem]"
              >
                <Download className="size-4" />
                Export CSV
              </button>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <button
                    key={expense.id}
                    type="button"
                    onClick={() => setSelectedExpenseId(expense.id)}
                    className={cn(
                      "w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition",
                      selectedExpense?.id === expense.id
                        ? "border-[#0b7a4b] ring-4 ring-[#0b7a4b]/10"
                        : "border-[#e1e7e3] hover:border-[#0b7a4b]/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-[#0b7a4b]">
                          {expense.expenseNumber}
                        </p>
                        <h3 className="mt-1 font-black">{expense.category}</h3>
                        <p className="text-muted mt-1 text-xs">
                          {formatDate(expense.expenseDate)} ·{" "}
                          {expense.storeName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-black",
                          statusClasses[expense.status] ??
                            "bg-slate-100 text-slate-700",
                        )}
                      >
                        {statusLabels[expense.status] ?? expense.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xl font-black">
                        {formatMoney(expense.totalAmount)}
                      </p>
                      <p className="text-muted text-xs font-bold">
                        {expense.documentCount} justificatif(s)
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-[#b8cdc0] bg-white p-10 text-center">
                  <ReceiptText className="mx-auto size-10 text-[#0b7a4b]" />
                  <h3 className="mt-4 text-lg font-black">
                    Aucune dépense trouvée
                  </h3>
                  <p className="text-muted mt-2 text-sm">
                    Enregistrez une dépense ou modifiez les filtres.
                  </p>
                </div>
              )}
            </div>

            <aside className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
              {selectedExpense ? (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black tracking-[0.2em] text-[#0b7a4b] uppercase">
                        Détail dépense
                      </p>
                      <h2 className="mt-2 text-2xl font-black">
                        {selectedExpense.expenseNumber}
                      </h2>
                      <p className="text-muted mt-1 text-sm">
                        {selectedExpense.businessName} ·{" "}
                        {selectedExpense.storeName}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-black",
                        statusClasses[selectedExpense.status] ??
                          "bg-slate-100 text-slate-700",
                      )}
                    >
                      {statusLabels[selectedExpense.status] ??
                        selectedExpense.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#f8fbf9] p-4">
                      <p className="text-muted text-xs font-bold">HT</p>
                      <p className="mt-1 text-sm font-black">
                        {formatMoney(selectedExpense.amountExcludingTax)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f8fbf9] p-4">
                      <p className="text-muted text-xs font-bold">TVA</p>
                      <p className="mt-1 text-sm font-black">
                        {formatMoney(selectedExpense.taxAmount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f8fbf9] p-4">
                      <p className="text-muted text-xs font-bold">TTC</p>
                      <p className="mt-1 text-sm font-black">
                        {formatMoney(selectedExpense.totalAmount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f8fbf9] p-4">
                      <p className="text-muted text-xs font-bold">
                        Justificatifs
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {selectedExpense.documentCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#edf0ee] p-4 text-sm">
                    <p className="font-black">{selectedExpense.category}</p>
                    <p className="text-muted mt-2 leading-6">
                      {selectedExpense.description ?? "Sans description"}
                    </p>
                    <p className="text-muted mt-3 text-xs">
                      Référence : {selectedExpense.reference ?? "—"} · Échéance
                      : {formatDate(selectedExpense.dueDate)}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {selectedExpense.status === "draft" ? (
                      <button
                        type="button"
                        onClick={() =>
                          runExpenseAction(selectedExpense.id, "submit")
                        }
                        disabled={isActionLoading}
                        className="h-11 rounded-2xl bg-amber-600 px-4 text-xs font-black text-white disabled:opacity-50"
                      >
                        Soumettre
                      </button>
                    ) : null}
                    {selectedExpense.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            runExpenseAction(selectedExpense.id, "approve")
                          }
                          disabled={isActionLoading}
                          className="h-11 rounded-2xl bg-[#0b7a4b] px-4 text-xs font-black text-white disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            runExpenseAction(selectedExpense.id, "reject")
                          }
                          disabled={isActionLoading}
                          className="h-11 rounded-2xl bg-red-600 px-4 text-xs font-black text-white disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                      </>
                    ) : null}
                    {["approved", "pending"].includes(
                      selectedExpense.status,
                    ) ? (
                      <button
                        type="button"
                        onClick={() =>
                          runExpenseAction(selectedExpense.id, "mark_paid")
                        }
                        disabled={isActionLoading}
                        className="h-11 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white disabled:opacity-50"
                      >
                        Marquer payé
                      </button>
                    ) : null}
                    {!["paid", "cancelled"].includes(selectedExpense.status) ? (
                      <button
                        type="button"
                        onClick={() =>
                          runExpenseAction(selectedExpense.id, "cancel")
                        }
                        disabled={isActionLoading}
                        className="h-11 rounded-2xl border border-[#dbe4dd] px-4 text-xs font-black text-red-700 disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    ) : null}
                  </div>

                  <section className="mt-5 rounded-2xl border border-[#edf0ee] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">Justificatifs</h3>
                        <p className="text-muted mt-1 text-xs">
                          PDF, JPG, PNG ou WebP · 5 Mo maximum.
                        </p>
                      </div>
                      <FileText className="size-5 text-[#0b7a4b]" />
                    </div>

                    <form
                      onSubmit={uploadExpenseDocument}
                      className="mt-4 space-y-3"
                    >
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          setDocumentFile(event.target.files?.[0] ?? null)
                        }
                        className="block w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-xs file:mr-4 file:rounded-xl file:border-0 file:bg-[#e9f5ee] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#0b7a4b]"
                      />
                      <button
                        type="submit"
                        disabled={!documentFile || isDocumentUploading}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDocumentUploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                        Ajouter le justificatif
                      </button>
                    </form>

                    <div className="mt-4 space-y-2">
                      {selectedExpenseDocuments.length > 0 ? (
                        selectedExpenseDocuments.map((document) => (
                          <div
                            key={document.id}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbf9] px-4 py-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-black">
                                {document.fileName}
                              </p>
                              <p className="text-muted mt-1">
                                {formatFileSize(document.fileSize)} ·{" "}
                                {formatDate(document.createdAt)}
                              </p>
                            </div>
                            {document.downloadUrl ? (
                              <a
                                href={document.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 font-black text-[#0b7a4b]"
                              >
                                <ExternalLink className="size-3.5" />
                                Ouvrir
                              </a>
                            ) : (
                              <span className="text-muted shrink-0 font-bold">
                                Lien indisponible
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-muted rounded-2xl bg-[#f8fbf9] px-4 py-3 text-xs">
                          Aucun justificatif lié à cette dépense.
                        </p>
                      )}
                    </div>
                  </section>

                  <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                    Les liens de téléchargement sont signés temporairement et
                    expirent automatiquement pour protéger les justificatifs.
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <ReceiptText className="mx-auto size-10 text-[#0b7a4b]" />
                  <h3 className="mt-3 font-black">Sélectionnez une dépense</h3>
                  <p className="text-muted mt-2 text-sm">
                    Le détail apparaîtra ici.
                  </p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </section>
    </div>
  );
}
