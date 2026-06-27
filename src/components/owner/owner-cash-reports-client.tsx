"use client";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  ClipboardList,
  Download,
  Printer,
  ReceiptText,
  Search,
  Store,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import { cn } from "@/lib/utils";
import type { CashSessionReport } from "@/lib/pos-cash-reports";

export type OwnerCashReportBusiness = {
  id: string;
  name: string;
};

export type OwnerCashReportStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerCashReportItem = CashSessionReport & {
  businessName: string;
  storeName: string;
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

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

export function OwnerCashReportsClient({
  businesses,
  stores,
  reports,
}: Readonly<{
  businesses: OwnerCashReportBusiness[];
  stores: OwnerCashReportStore[];
  reports: OwnerCashReportItem[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedReportId, setSelectedReportId] = useState(
    reports[0]?.id ?? "",
  );

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reports.filter((report) => {
      if (businessId && report.businessId !== businessId) return false;
      if (storeId !== "all" && report.storeId !== storeId) return false;
      if (date && formatDateInput(report.closedAt) !== date) return false;
      if (!normalizedSearch) return true;

      return [
        report.businessName,
        report.storeName,
        report.openedByName,
        report.closedByName,
        report.notes,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [businessId, date, reports, search, storeId]);

  const selectedReport =
    filteredReports.find((report) => report.id === selectedReportId) ??
    filteredReports[0] ??
    null;
  const totalCash = filteredReports.reduce(
    (total, report) => total + report.cashSalesTotal,
    0,
  );
  const totalMobileMoney = filteredReports.reduce(
    (total, report) => total + report.mobileMoneyTotal,
    0,
  );
  const totalDifferences = filteredReports.reduce(
    (total, report) => total + report.differenceAmount,
    0,
  );
  const sessionsWithGap = filteredReports.filter(
    (report) => report.differenceAmount !== 0,
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
    setSelectedReportId("");
  }

  function exportFilteredReports() {
    const selectedBusiness =
      businesses.find((business) => business.id === businessId)?.name ??
      "toutes-entreprises";
    const filename = [
      "africrm-rapports-z",
      getSafeFilePart(selectedBusiness),
      date || "periode",
    ]
      .filter(Boolean)
      .join("-");

    downloadCsvFile(filename, [
      [
        "Entreprise",
        "Boutique",
        "Ouverture",
        "Fermeture",
        "Ouvert par",
        "Ferme par",
        "Nombre ventes",
        "Total ventes",
        "Ventes cash",
        "Mobile money",
        "Entrees manuelles",
        "Sorties manuelles",
        "Cash attendu",
        "Cash compte",
        "Ecart",
        "Nombre mouvements",
        "Notes",
        "Session ID",
      ],
      ...filteredReports.map((report) => [
        report.businessName,
        report.storeName,
        formatDateTime(report.openedAt),
        formatDateTime(report.closedAt),
        report.openedByName ?? "",
        report.closedByName ?? "",
        report.salesCount,
        report.grossSalesTotal,
        report.cashSalesTotal,
        report.mobileMoneyTotal,
        report.manualCashInTotal,
        report.manualCashOutTotal,
        report.calculatedExpectedCash,
        report.closingBalance,
        report.differenceAmount,
        report.movements.length,
        report.notes ?? "",
        report.id,
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Rapports Z</p>
            <ClipboardList className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-3xl font-black">{filteredReports.length}</p>
          <p className="text-muted mt-1 text-xs">sessions clôturées</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Cash encaissé</p>
            <Banknote className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">{formatMoney(totalCash)}</p>
          <p className="text-muted mt-1 text-xs">ventes espèces</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Mobile Money</p>
            <WalletCards className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(totalMobileMoney)}
          </p>
          <p className="text-muted mt-1 text-xs">hors espèces</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Écarts</p>
            <AlertTriangle className="size-5 text-amber-600" />
          </div>
          <p
            className={cn(
              "mt-3 text-2xl font-black",
              totalDifferences === 0
                ? "text-[#14251d]"
                : totalDifferences > 0
                  ? "text-amber-700"
                  : "text-red-700",
            )}
          >
            {formatMoney(totalDifferences)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {sessionsWithGap.length} session(s) à vérifier
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Rapports de clôture</h2>
            <p className="text-muted mt-1 text-xs">
              Retrouvez les rapports Z générés à la fermeture des sessions de
              caisse.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4 xl:min-w-[780px]">
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
              Date clôture
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
                placeholder="Caissier, note..."
              />
            </label>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0ee] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-xs font-bold">
            {filteredReports.length} rapport(s) dans l’export actuel.
          </p>
          <button
            type="button"
            onClick={exportFilteredReports}
            disabled={filteredReports.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-45 print:hidden"
          >
            <Download className="size-4" />
            Exporter CSV
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-3">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={cn(
                  "w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition",
                  selectedReport?.id === report.id
                    ? "border-[#0b7a4b] ring-4 ring-[#0b7a4b]/10"
                    : "border-[#e1e7e3] hover:border-[#0b7a4b]/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#0b7a4b]">
                      {report.storeName}
                    </p>
                    <h3 className="mt-1 font-black">
                      Clôture du {formatDateTime(report.closedAt)}
                    </h3>
                    <p className="text-muted mt-1 text-xs">
                      {report.businessName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black",
                      report.differenceAmount === 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {report.differenceAmount === 0 ? "Équilibré" : "Écart"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-2xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {formatMoney(report.cashSalesTotal)}
                    </p>
                    <p className="text-muted mt-1">Cash</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {report.salesCount}
                    </p>
                    <p className="text-muted mt-1">ventes</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8fbf9] p-2">
                    <p
                      className={cn(
                        "font-black",
                        report.differenceAmount === 0
                          ? "text-[#0b7a4b]"
                          : report.differenceAmount > 0
                            ? "text-amber-700"
                            : "text-red-700",
                      )}
                    >
                      {formatMoney(report.differenceAmount)}
                    </p>
                    <p className="text-muted mt-1">écart</p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#b8cdc0] bg-white p-10 text-center">
              <ReceiptText className="mx-auto size-10 text-[#0b7a4b]" />
              <h3 className="mt-4 text-lg font-black">
                Aucun rapport Z disponible
              </h3>
              <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-6">
                Fermez une session de caisse dans le POS pour générer un rapport
                de clôture.
              </p>
            </div>
          )}
        </div>

        {selectedReport ? (
          <article
            id="cash-report-printable"
            className="rounded-[2rem] border border-[#e1e7e3] bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 border-b border-[#e1e7e3] pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black tracking-[0.24em] text-[#0b7a4b] uppercase">
                  Rapport Z
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {selectedReport.storeName}
                </h2>
                <p className="text-muted mt-1 text-sm">
                  {selectedReport.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white print:hidden"
              >
                <Printer className="size-4" />
                Imprimer
              </button>
            </div>

            <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-muted text-xs font-bold">Ouverture</p>
                <p className="mt-1 font-black">
                  {formatDateTime(selectedReport.openedAt)}
                </p>
                <p className="text-muted mt-1 text-xs">
                  Par {selectedReport.openedByName ?? "Non renseigné"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-muted text-xs font-bold">Fermeture</p>
                <p className="mt-1 font-black">
                  {formatDateTime(selectedReport.closedAt)}
                </p>
                <p className="text-muted mt-1 text-xs">
                  Par {selectedReport.closedByName ?? "Non renseigné"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Fonds initial", selectedReport.openingBalance],
                ["Ventes cash", selectedReport.cashSalesTotal],
                ["Mobile Money", selectedReport.mobileMoneyTotal],
                ["Entrées manuelles", selectedReport.manualCashInTotal],
                ["Sorties manuelles", -selectedReport.manualCashOutTotal],
                ["Cash attendu", selectedReport.calculatedExpectedCash],
                ["Cash compté", selectedReport.closingBalance],
                ["Écart", selectedReport.differenceAmount],
                ["Total ventes", selectedReport.grossSalesTotal],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="rounded-2xl border border-[#edf0ee] bg-white p-4"
                >
                  <p className="text-muted text-[10px] font-black uppercase">
                    {label as string}
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {formatMoney(value as number)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0ee] p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[#0b7a4b]" />
                <h3 className="text-sm font-black">Résumé opérationnel</h3>
              </div>
              <div className="mt-4 grid gap-3 text-xs md:grid-cols-3">
                <p>
                  <span className="text-muted block font-bold">Ventes</span>
                  <strong>{selectedReport.salesCount}</strong>
                </p>
                <p>
                  <span className="text-muted block font-bold">Mouvements</span>
                  <strong>{selectedReport.movements.length}</strong>
                </p>
                <p>
                  <span className="text-muted block font-bold">Session ID</span>
                  <strong className="break-all">{selectedReport.id}</strong>
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#edf0ee] p-4">
              <div className="flex items-center gap-2">
                <Store className="size-4 text-[#0b7a4b]" />
                <h3 className="text-sm font-black">Mouvements manuels</h3>
              </div>
              <div className="mt-4 space-y-2">
                {selectedReport.movements.length > 0 ? (
                  selectedReport.movements.map((movement) => {
                    const isIn = ["cash_in", "deposit"].includes(
                      movement.movementType,
                    );
                    return (
                      <div
                        key={movement.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbf9] px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-black">{movement.reason}</p>
                          <p className="text-muted mt-0.5 text-[10px]">
                            {formatDateTime(movement.createdAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "font-black",
                            isIn ? "text-emerald-700" : "text-red-700",
                          )}
                        >
                          {isIn ? "+" : "-"}
                          {formatMoney(movement.amount)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted text-xs">
                    Aucun mouvement manuel sur cette session.
                  </p>
                )}
              </div>
            </div>

            {selectedReport.notes ? (
              <div className="mt-5 rounded-2xl border border-[#edf0ee] bg-[#f8fbf9] p-4 text-xs">
                <p className="font-black">Note de clôture</p>
                <p className="text-muted mt-2 leading-5">
                  {selectedReport.notes}
                </p>
              </div>
            ) : null}
          </article>
        ) : null}
      </section>
    </div>
  );
}
