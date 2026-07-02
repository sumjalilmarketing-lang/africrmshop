"use client";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import { buildOwnerSalesSummary } from "@/lib/owner-sales-summary";
import { cn } from "@/lib/utils";

export type OwnerSaleBusiness = {
  id: string;
  name: string;
};

export type OwnerSaleStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerSaleLine = {
  id: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
};

export type OwnerSaleItem = {
  id: string;
  businessId: string;
  businessName: string;
  storeId: string;
  storeName: string;
  customerName: string | null;
  receiptNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethodName: string;
  paymentProvider: string | null;
  paymentReference: string | null;
  paymentAmount: number;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
  afterSaleAction: "cancel" | "refund" | null;
  afterSaleReason: string | null;
  afterSaleRestocked: boolean | null;
  afterSaleProcessedAt: string | null;
  lines: OwnerSaleLine[];
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const statusLabels: Record<string, string> = {
  completed: "Encaissée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

const paymentStatusLabels: Record<string, string> = {
  completed: "Payé",
  refunded: "Remboursé",
  cancelled: "Annulé",
  failed: "Échec",
  pending: "En attente",
};

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
    timeStyle: "short",
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

function getStatusBadgeClass(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "refunded") return "bg-red-50 text-red-700";
  if (status === "cancelled") return "bg-amber-50 text-amber-700";

  return "bg-slate-100 text-slate-700";
}

export function OwnerSalesClient({
  businesses,
  stores,
  sales,
}: Readonly<{
  businesses: OwnerSaleBusiness[];
  stores: OwnerSaleStore[];
  sales: OwnerSaleItem[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState(sales[0]?.id ?? "");

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredSales = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sales.filter((sale) => {
      if (businessId && sale.businessId !== businessId) return false;
      if (storeId !== "all" && sale.storeId !== storeId) return false;
      if (status !== "all" && sale.status !== status) return false;
      if (date && formatDateInput(sale.createdAt) !== date) return false;
      if (!normalizedSearch) return true;

      return [
        sale.receiptNumber,
        sale.businessName,
        sale.storeName,
        sale.customerName,
        sale.paymentMethodName,
        sale.paymentReference,
        sale.afterSaleReason,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [businessId, date, sales, search, status, storeId]);

  const selectedSale =
    filteredSales.find((sale) => sale.id === selectedSaleId) ??
    filteredSales[0] ??
    null;
  const salesSummary = useMemo(
    () => buildOwnerSalesSummary(filteredSales),
    [filteredSales],
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
    setSelectedSaleId("");
  }

  function exportFilteredSales() {
    const selectedBusiness =
      businesses.find((business) => business.id === businessId)?.name ??
      "toutes-entreprises";
    const filename = [
      "africrm-ventes",
      getSafeFilePart(selectedBusiness),
      date || "periode",
      status === "all" ? "tous-statuts" : status,
    ]
      .filter(Boolean)
      .join("-");

    downloadCsvFile(filename, [
      [
        "Ticket",
        "Date",
        "Entreprise",
        "Boutique",
        "Client",
        "Statut vente",
        "Statut paiement",
        "Methode paiement",
        "Reference paiement",
        "Sous-total",
        "TVA",
        "Total",
        "Montant paye",
        "Action apres-vente",
        "Motif apres-vente",
        "Stock restaure",
      ],
      ...filteredSales.map((sale) => [
        sale.receiptNumber,
        formatDateTime(sale.createdAt),
        sale.businessName,
        sale.storeName,
        sale.customerName ?? "Client comptoir",
        statusLabels[sale.status] ?? sale.status,
        paymentStatusLabels[sale.paymentStatus] ?? sale.paymentStatus,
        sale.paymentMethodName,
        sale.paymentReference,
        sale.subtotal,
        sale.taxTotal,
        sale.totalAmount,
        sale.paidAmount,
        sale.afterSaleAction ?? "",
        sale.afterSaleReason ?? "",
        sale.afterSaleRestocked === null
          ? ""
          : sale.afterSaleRestocked
            ? "oui"
            : "non",
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">CA encaissé</p>
            <Banknote className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(salesSummary.completedTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">ventes finalisées</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Tickets encaissés</p>
            <ReceiptText className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">
            {salesSummary.completedCount}
          </p>
          <p className="text-muted mt-1 text-xs">sur la période filtrée</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Contrôle paiements</p>
            <ShieldCheck
              className={cn(
                "size-5",
                salesSummary.paymentGapCount === 0
                  ? "text-[#0b7a4b]"
                  : "text-amber-600",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {salesSummary.paymentControlRate}%
          </p>
          <p className="text-muted mt-1 text-xs">
            {salesSummary.paymentGapCount} ticket(s) ·{" "}
            {formatMoney(salesSummary.paymentGapAmount)}
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Après-vente</p>
            <RotateCcw className="size-5 text-red-600" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(salesSummary.afterSaleTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {salesSummary.cancelledCount} annulation(s) /{" "}
            {salesSummary.refundedCount} remboursement(s)
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Panier moyen</p>
            <CreditCard className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(salesSummary.averageBasket)}
          </p>
          <p className="text-muted mt-1 text-xs">
            TVA {formatMoney(salesSummary.taxTotal)}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Registre des ventes</h2>
            <p className="text-muted mt-1 text-xs">
              Filtrez les tickets, contrôlez les paiements et vérifiez les
              annulations/remboursements.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-5 xl:min-w-[920px]">
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
                <option value="completed">Encaissée</option>
                <option value="cancelled">Annulée</option>
                <option value="refunded">Remboursée</option>
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
                placeholder="Ticket, client..."
              />
            </label>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0ee] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-xs font-bold">
            {filteredSales.length} vente(s) dans l’export actuel.
          </p>
          <button
            type="button"
            onClick={exportFilteredSales}
            disabled={filteredSales.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-45 print:hidden"
          >
            <Download className="size-4" />
            Exporter CSV
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-3">
          {filteredSales.length > 0 ? (
            filteredSales.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setSelectedSaleId(sale.id)}
                className={cn(
                  "w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition",
                  selectedSale?.id === sale.id
                    ? "border-[#0b7a4b] ring-4 ring-[#0b7a4b]/10"
                    : "border-[#e1e7e3] hover:border-[#0b7a4b]/40",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-[#0b7a4b]">
                      {sale.receiptNumber}
                    </p>
                    <h3 className="mt-1 font-black">
                      {formatMoney(sale.totalAmount)}
                    </h3>
                    <p className="text-muted mt-1 text-xs">
                      {sale.storeName} · {formatDateTime(sale.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black",
                      getStatusBadgeClass(sale.status),
                    )}
                  >
                    {statusLabels[sale.status] ?? sale.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-[#68736c]">
                  <span className="rounded-full bg-[#f4f7f5] px-3 py-1">
                    {sale.paymentMethodName}
                  </span>
                  <span className="rounded-full bg-[#f4f7f5] px-3 py-1">
                    {sale.customerName ?? "Client comptoir"}
                  </span>
                  <span className="rounded-full bg-[#f4f7f5] px-3 py-1">
                    {sale.lines.length} ligne(s)
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#dbe4dd] bg-white p-8 text-center">
              <AlertTriangle className="mx-auto size-8 text-amber-600" />
              <h3 className="mt-3 font-black">Aucune vente trouvée</h3>
              <p className="text-muted mt-2 text-sm">
                Ajustez les filtres ou encaissez une vente depuis la caisse POS.
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:self-start">
          {selectedSale ? (
            <div>
              <div className="flex flex-col gap-4 border-b border-[#e1e7e3] pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-[#0b7a4b] uppercase">
                    Détail ticket
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {selectedSale.receiptNumber}
                  </h2>
                  <p className="text-muted mt-1 text-sm">
                    {selectedSale.businessName} · {selectedSale.storeName}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black",
                    getStatusBadgeClass(selectedSale.status),
                  )}
                >
                  {selectedSale.status === "completed" ? (
                    <CheckCircle2 className="size-4" />
                  ) : selectedSale.status === "refunded" ? (
                    <RotateCcw className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {statusLabels[selectedSale.status] ?? selectedSale.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-[#f4f7f5] p-4">
                  <p className="text-muted text-xs font-bold">Date</p>
                  <p className="mt-1 text-sm font-black">
                    {formatDateTime(selectedSale.createdAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f7f5] p-4">
                  <p className="text-muted text-xs font-bold">Client</p>
                  <p className="mt-1 text-sm font-black">
                    {selectedSale.customerName ?? "Client comptoir"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f7f5] p-4">
                  <p className="text-muted text-xs font-bold">Paiement</p>
                  <p className="mt-1 text-sm font-black">
                    {selectedSale.paymentMethodName}
                  </p>
                  <p className="text-muted mt-1 text-[11px]">
                    {paymentStatusLabels[selectedSale.paymentStatus] ??
                      selectedSale.paymentStatus}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f4f7f5] p-4">
                  <p className="text-muted text-xs font-bold">Référence</p>
                  <p className="mt-1 text-sm font-black">
                    {selectedSale.paymentReference ?? "—"}
                  </p>
                </div>
              </div>

              {selectedSale.afterSaleReason ? (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-black text-amber-800">
                    Action après-vente
                  </p>
                  <p className="mt-2 text-sm font-bold text-amber-900">
                    {selectedSale.afterSaleAction === "cancel"
                      ? "Annulation"
                      : "Remboursement"}{" "}
                    ·{" "}
                    {selectedSale.afterSaleRestocked
                      ? "stock restauré"
                      : "sans remise en stock"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-amber-800">
                    {selectedSale.afterSaleReason}
                  </p>
                  {selectedSale.afterSaleProcessedAt ? (
                    <p className="mt-2 text-[11px] font-bold text-amber-700">
                      Traité le{" "}
                      {formatDateTime(selectedSale.afterSaleProcessedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <Store className="size-4 text-[#0b7a4b]" />
                  <h3 className="text-sm font-black">Articles</h3>
                </div>
                <div className="space-y-2">
                  {selectedSale.lines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-2xl border border-[#e1e7e3] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">
                            {line.productName}
                          </p>
                          <p className="text-muted mt-1 text-[11px]">
                            {line.sku ?? "Sans SKU"} · Qté {line.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-black">
                          {formatMoney(line.lineTotal)}
                        </p>
                      </div>
                      <p className="text-muted mt-2 text-[11px]">
                        PU {formatMoney(line.unitPrice)} · TVA{" "}
                        {formatMoney(line.taxAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#14251d] p-5 text-white">
                <div className="flex items-center justify-between text-sm">
                  <span>Sous-total</span>
                  <strong>{formatMoney(selectedSale.subtotal)}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/75">
                  <span>TVA</span>
                  <strong>{formatMoney(selectedSale.taxTotal)}</strong>
                </div>
                <div className="mt-4 border-t border-white/15 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-black">Total</span>
                    <strong className="text-xl">
                      {formatMoney(selectedSale.totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#dbe4dd] text-xs font-black text-[#0b7a4b]"
              >
                <CalendarDays className="size-4" />
                Imprimer / sauvegarder le détail
              </button>
            </div>
          ) : (
            <div className="py-12 text-center">
              <ReceiptText className="mx-auto size-10 text-[#0b7a4b]" />
              <h3 className="mt-3 font-black">Sélectionnez une vente</h3>
              <p className="text-muted mt-2 text-sm">
                Le détail du ticket apparaîtra ici.
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
