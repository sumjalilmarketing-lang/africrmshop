"use client";

import {
  AlertTriangle,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Download,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import type { AssistedAccountingEntry } from "@/lib/assisted-accounting";
import { buildOwnerAccountingSummary } from "@/lib/owner-accounting-summary";
import { cn } from "@/lib/utils";

export type OwnerAccountingBusiness = {
  id: string;
  name: string;
};

export type OwnerAccountingStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerAccountingEntry = AssistedAccountingEntry & {
  businessName: string;
  storeName: string;
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const sourceLabels: Record<OwnerAccountingEntry["sourceType"], string> = {
  sale: "Vente",
  refund: "Annulation / remboursement",
  expense: "Dépense",
};

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatDate(value: string) {
  if (!value) return "Date non renseignée";

  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateInput(value: string) {
  return value.slice(0, 10);
}

function getSafeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OwnerAccountingClient({
  businesses,
  stores,
  entries,
}: Readonly<{
  businesses: OwnerAccountingBusiness[];
  stores: OwnerAccountingStore[];
  entries: OwnerAccountingEntry[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState(entries[0]?.id ?? "");

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (businessId && entry.businessId !== businessId) return false;
      if (storeId !== "all" && entry.storeId !== storeId) return false;
      if (sourceType !== "all" && entry.sourceType !== sourceType) return false;
      if (date && formatDateInput(entry.entryDate) !== date) return false;
      if (!normalizedSearch) return true;

      return [
        entry.reference,
        entry.description,
        entry.businessName,
        entry.storeName,
        sourceLabels[entry.sourceType],
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [businessId, date, entries, search, sourceType, storeId]);
  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedEntryId) ??
    filteredEntries[0] ??
    null;
  const accountingSummary = useMemo(
    () => buildOwnerAccountingSummary(filteredEntries),
    [filteredEntries],
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
    setSelectedEntryId("");
  }

  function exportFilteredEntries() {
    const selectedBusiness =
      businesses.find((business) => business.id === businessId)?.name ??
      "toutes-entreprises";
    const filename = [
      "africrm-journal-comptable-assiste",
      getSafeFilePart(selectedBusiness),
      date || "periode",
      sourceType === "all" ? "toutes-sources" : sourceType,
    ]
      .filter(Boolean)
      .join("-");

    downloadCsvFile(filename, [
      [
        "Date",
        "Entreprise",
        "Boutique",
        "Source",
        "Reference",
        "Description",
        "Compte",
        "Libelle compte",
        "Debit",
        "Credit",
        "Equilibree",
      ],
      ...filteredEntries.flatMap((entry) =>
        entry.lines.map((line) => [
          formatDate(entry.entryDate),
          entry.businessName,
          entry.storeName,
          sourceLabels[entry.sourceType],
          entry.reference,
          line.description,
          line.accountCode,
          line.accountName,
          line.debit,
          line.credit,
          entry.isBalanced ? "oui" : "non",
        ]),
      ),
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Écritures</p>
            <BookOpenCheck className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {accountingSummary.entryCount}
          </p>
          <p className="text-muted mt-1 text-xs">brouillons assistés</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Équilibre</p>
            <ShieldCheck
              className={cn(
                "size-5",
                accountingSummary.unbalancedEntryCount === 0
                  ? "text-[#0b7a4b]"
                  : "text-amber-600",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {accountingSummary.balancedRate}%
          </p>
          <p className="text-muted mt-1 text-xs">
            écart {formatMoney(accountingSummary.balanceGapAmount)}
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Débit</p>
            <Calculator className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(accountingSummary.totalDebit)}
          </p>
          <p className="text-muted mt-1 text-xs">total journal filtré</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Crédit</p>
            <WalletCards className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(accountingSummary.totalCredit)}
          </p>
          <p className="text-muted mt-1 text-xs">total journal filtré</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Contrôle</p>
            {accountingSummary.unbalancedEntryCount === 0 ? (
              <CheckCircle2 className="size-5 text-[#0b7a4b]" />
            ) : (
              <AlertTriangle className="size-5 text-amber-600" />
            )}
          </div>
          <p
            className={cn(
              "mt-3 text-2xl font-black",
              accountingSummary.unbalancedEntryCount === 0
                ? "text-[#14251d]"
                : "text-amber-700",
            )}
          >
            {accountingSummary.unbalancedEntryCount}
          </p>
          <p className="text-muted mt-1 text-xs">
            écriture(s) déséquilibrée(s)
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Journal assisté</h2>
            <p className="text-muted mt-1 text-xs">
              Les écritures sont préparées en brouillon pour validation par un
              comptable.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-6 xl:min-w-[1040px]">
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
              Source
              <select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="all">Toutes</option>
                <option value="sale">Ventes</option>
                <option value="refund">Après-vente</option>
                <option value="expense">Dépenses</option>
              </select>
            </label>
            <label className="block text-xs font-bold">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              />
            </label>
            <label className="relative block text-xs font-bold">
              Recherche
              <Search className="absolute bottom-4 left-4 size-4 text-[#68736c]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white pr-4 pl-11 text-sm outline-none focus:border-[#0b7a4b]"
                placeholder="Référence..."
              />
            </label>
            <button
              type="button"
              onClick={exportFilteredEntries}
              disabled={filteredEntries.length === 0}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 md:mt-[1.625rem]"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-3">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntryId(entry.id)}
                className={cn(
                  "w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition",
                  selectedEntry?.id === entry.id
                    ? "border-[#0b7a4b] ring-4 ring-[#0b7a4b]/10"
                    : "border-[#e1e7e3] hover:border-[#0b7a4b]/40",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-[#0b7a4b]">
                      {sourceLabels[entry.sourceType]}
                    </p>
                    <h3 className="mt-1 font-black">{entry.reference}</h3>
                    <p className="text-muted mt-1 text-xs">
                      {formatDate(entry.entryDate)} · {entry.storeName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black",
                      entry.isBalanced
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {entry.isBalanced ? "Équilibrée" : "À vérifier"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="rounded-2xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {formatMoney(entry.totalDebit)}
                    </p>
                    <p className="text-muted mt-1">Débit</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {formatMoney(entry.totalCredit)}
                    </p>
                    <p className="text-muted mt-1">Crédit</p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#b8cdc0] bg-white p-10 text-center">
              <ReceiptText className="mx-auto size-10 text-[#0b7a4b]" />
              <h3 className="mt-4 text-lg font-black">
                Aucune écriture assistée
              </h3>
              <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-6">
                Encaissez des ventes ou modifiez les filtres.
              </p>
            </div>
          )}
        </div>

        <article className="rounded-[2rem] border border-[#e1e7e3] bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
          {selectedEntry ? (
            <div>
              <div className="flex flex-col gap-4 border-b border-[#e1e7e3] pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.24em] text-[#0b7a4b] uppercase">
                    Écriture brouillon
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {selectedEntry.reference}
                  </h2>
                  <p className="text-muted mt-1 text-sm">
                    {selectedEntry.businessName} · {selectedEntry.storeName}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black",
                    selectedEntry.isBalanced
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {selectedEntry.isBalanced ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                  {selectedEntry.isBalanced ? "Équilibrée" : "À vérifier"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-[#f8fbf9] p-4">
                  <p className="text-muted text-xs font-bold">Date</p>
                  <p className="mt-1 text-sm font-black">
                    {formatDate(selectedEntry.entryDate)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f8fbf9] p-4">
                  <p className="text-muted text-xs font-bold">Débit</p>
                  <p className="mt-1 text-sm font-black">
                    {formatMoney(selectedEntry.totalDebit)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f8fbf9] p-4">
                  <p className="text-muted text-xs font-bold">Crédit</p>
                  <p className="mt-1 text-sm font-black">
                    {formatMoney(selectedEntry.totalCredit)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                Journal assisté non validé fiscalement. Les comptes proposés
                doivent être vérifiés par le comptable de l’entreprise.
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-[#edf0ee]">
                <table className="min-w-full divide-y divide-[#edf0ee] text-left text-xs">
                  <thead className="bg-[#f8fbf9] text-[#68736c]">
                    <tr>
                      <th className="px-4 py-3 font-black">Compte</th>
                      <th className="px-4 py-3 font-black">Libellé</th>
                      <th className="px-4 py-3 text-right font-black">Débit</th>
                      <th className="px-4 py-3 text-right font-black">
                        Crédit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0ee]">
                    {selectedEntry.lines.map((line) => (
                      <tr key={`${line.accountCode}:${line.description}`}>
                        <td className="px-4 py-3 font-black">
                          {line.accountCode}
                          <span className="text-muted block text-[10px]">
                            {line.accountName}
                          </span>
                        </td>
                        <td className="px-4 py-3">{line.description}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {line.debit ? formatMoney(line.debit) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {line.credit ? formatMoney(line.credit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <BookOpenCheck className="mx-auto size-10 text-[#0b7a4b]" />
              <h3 className="mt-3 font-black">Sélectionnez une écriture</h3>
              <p className="text-muted mt-2 text-sm">
                Le détail débit/crédit apparaîtra ici.
              </p>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <p className="text-muted text-xs font-bold">Ventes</p>
          <p className="mt-2 text-2xl font-black">
            {accountingSummary.saleEntryCount}
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <p className="text-muted text-xs font-bold">Après-vente</p>
          <p className="mt-2 text-2xl font-black">
            {accountingSummary.refundEntryCount}
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <p className="text-muted text-xs font-bold">Dépenses</p>
          <p className="mt-2 text-2xl font-black">
            {accountingSummary.expenseEntryCount}
          </p>
        </article>
      </section>
    </div>
  );
}
