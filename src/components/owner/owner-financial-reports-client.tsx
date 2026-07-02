"use client";

import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  Download,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import { buildOwnerFinancialSummary } from "@/lib/owner-financial-summary";
import type {
  FinancialReportPeriod,
  FinancialReportRow,
} from "@/lib/owner-financial-reports";
import { cn } from "@/lib/utils";

export type OwnerFinancialBusiness = {
  id: string;
  name: string;
};

export type OwnerFinancialStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerFinancialReportRow = FinancialReportRow & {
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

function formatPeriod(value: string, periodType: FinancialReportPeriod) {
  if (periodType === "month") {
    return new Intl.DateTimeFormat("fr-SN", {
      month: "long",
      year: "numeric",
    }).format(new Date(`${value}-01T00:00:00`));
  }

  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function getSafeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OwnerFinancialReportsClient({
  businesses,
  stores,
  dailyRows,
  monthlyRows,
}: Readonly<{
  businesses: OwnerFinancialBusiness[];
  stores: OwnerFinancialStore[];
  dailyRows: OwnerFinancialReportRow[];
  monthlyRows: OwnerFinancialReportRow[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [periodType, setPeriodType] = useState<FinancialReportPeriod>("day");
  const [period, setPeriod] = useState("");

  const rows = periodType === "day" ? dailyRows : monthlyRows;
  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (businessId && row.businessId !== businessId) return false;
        if (storeId !== "all" && row.storeId !== storeId) return false;
        if (period && row.periodKey !== period) return false;

        return true;
      }),
    [businessId, period, rows, storeId],
  );
  const selectedBusiness =
    businesses.find((business) => business.id === businessId)?.name ??
    "Toutes entreprises";
  const financialSummary = useMemo(
    () => buildOwnerFinancialSummary(filteredRows),
    [filteredRows],
  );
  const periodOptions = [...new Set(rows.map((row) => row.periodKey))].sort(
    (first, second) => second.localeCompare(first),
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
  }

  function changePeriodType(nextPeriodType: FinancialReportPeriod) {
    setPeriodType(nextPeriodType);
    setPeriod("");
  }

  function exportFilteredRows() {
    const filename = [
      "africrm-reporting-financier",
      periodType === "day" ? "journalier" : "mensuel",
      getSafeFilePart(selectedBusiness),
      period || "periode",
    ]
      .filter(Boolean)
      .join("-");

    downloadCsvFile(filename, [
      [
        "Periode",
        "Entreprise",
        "Boutique",
        "Tickets encaisses",
        "Tickets annules",
        "Tickets rembourses",
        "CA brut",
        "Apres-vente",
        "CA net",
        "TVA collectee",
        "TVA annulee/remboursee",
        "Cash",
        "Mobile Money",
        "Paiements rembourses",
        "Ecart caisse",
      ],
      ...filteredRows.map((row) => [
        row.periodKey,
        row.businessName,
        row.storeName,
        row.completedSalesCount,
        row.cancelledSalesCount,
        row.refundedSalesCount,
        row.grossSalesTotal,
        row.afterSaleTotal,
        row.netSalesTotal,
        row.taxCollectedTotal,
        row.taxReversedTotal,
        row.cashTotal,
        row.mobileMoneyTotal,
        row.refundedPaymentTotal,
        row.cashDifferenceTotal,
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">CA net</p>
            <BarChart3 className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(financialSummary.netSalesTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">après remboursements</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Performance</p>
            <ShieldCheck
              className={cn(
                "size-5",
                financialSummary.afterSaleRate <= 5
                  ? "text-[#0b7a4b]"
                  : financialSummary.afterSaleRate <= 15
                    ? "text-amber-600"
                    : "text-red-700",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {financialSummary.afterSaleRate}%
          </p>
          <p className="text-muted mt-1 text-xs">taux après-vente</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">TVA collectée</p>
            <ReceiptText className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(financialSummary.taxCollectedTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {formatMoney(financialSummary.taxReversedTotal)} à surveiller
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Paiements</p>
            <WalletCards className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(
              financialSummary.cashTotal + financialSummary.mobileMoneyTotal,
            )}
          </p>
          <p className="text-muted mt-1 text-xs">
            mobile {financialSummary.mobileMoneyShareRate}% · cash{" "}
            {formatMoney(financialSummary.cashTotal)}
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Écart caisse</p>
            <AlertTriangle className="size-5 text-amber-600" />
          </div>
          <p
            className={cn(
              "mt-3 text-2xl font-black",
              financialSummary.cashDifferenceTotal === 0
                ? "text-[#14251d]"
                : financialSummary.cashDifferenceTotal > 0
                  ? "text-amber-700"
                  : "text-red-700",
            )}
          >
            {formatMoney(financialSummary.cashDifferenceTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {financialSummary.cashDifferenceRate}% du cash
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Filtres financiers</h2>
            <p className="text-muted mt-1 text-xs">
              Analysez les chiffres par entreprise, boutique et période.
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
              Vue
              <select
                value={periodType}
                onChange={(event) =>
                  changePeriodType(event.target.value as FinancialReportPeriod)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="day">Journalière</option>
                <option value="month">Mensuelle</option>
              </select>
            </label>
            <label className="block text-xs font-bold">
              Période
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="">Toutes</option>
                {periodOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatPeriod(option, periodType)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={exportFilteredRows}
              disabled={filteredRows.length === 0}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 md:mt-[1.625rem]"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-[#0b7a4b]" />
            <h2 className="font-black">Synthèse</h2>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            {[
              ["CA brut", financialSummary.grossSalesTotal],
              ["Annulations / remboursements", financialSummary.afterSaleTotal],
              ["CA net", financialSummary.netSalesTotal],
              ["TVA collectée", financialSummary.taxCollectedTotal],
              ["TVA annulée/remboursée", financialSummary.taxReversedTotal],
              ["Paiements remboursés", financialSummary.refundedPaymentTotal],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="flex items-center justify-between gap-4 rounded-2xl bg-[#f8fbf9] px-4 py-3"
              >
                <span className="text-muted font-bold">{label as string}</span>
                <strong>{formatMoney(value as number)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            Cette synthèse est une aide au pilotage. La validation fiscale
            finale doit être effectuée avec votre comptable.
          </div>
        </article>

        <article className="overflow-hidden rounded-3xl border border-[#e1e7e3] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e1e7e3] p-5">
            <div>
              <h2 className="font-black">Détail par période</h2>
              <p className="text-muted mt-1 text-xs">
                {filteredRows.length} ligne(s) affichée(s).
              </p>
            </div>
            <RefreshCcw className="size-5 text-[#0b7a4b]" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] divide-y divide-[#edf0ee] text-left text-xs">
              <thead className="bg-[#f8fbf9] text-[#68736c]">
                <tr>
                  <th className="px-4 py-3 font-black">Période</th>
                  <th className="px-4 py-3 font-black">Boutique</th>
                  <th className="px-4 py-3 font-black">Tickets</th>
                  <th className="px-4 py-3 font-black">CA net</th>
                  <th className="px-4 py-3 font-black">TVA</th>
                  <th className="px-4 py-3 font-black">Cash</th>
                  <th className="px-4 py-3 font-black">Mobile</th>
                  <th className="px-4 py-3 font-black">Après-vente</th>
                  <th className="px-4 py-3 font-black">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ee]">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr
                      key={`${row.periodType}:${row.periodKey}:${row.storeId}`}
                    >
                      <td className="px-4 py-3 font-black">
                        {formatPeriod(row.periodKey, row.periodType)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold">{row.storeName}</span>
                        <span className="text-muted mt-1 block text-[10px]">
                          {row.businessName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.completedSalesCount}
                        <span className="text-muted block text-[10px]">
                          {row.cancelledSalesCount + row.refundedSalesCount}{" "}
                          traité(s)
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black">
                        {formatMoney(row.netSalesTotal)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(row.taxCollectedTotal)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(row.cashTotal)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(row.mobileMoneyTotal)}
                      </td>
                      <td className="px-4 py-3">
                        {formatMoney(row.afterSaleTotal)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-black",
                          row.cashDifferenceTotal === 0
                            ? "text-[#14251d]"
                            : row.cashDifferenceTotal > 0
                              ? "text-amber-700"
                              : "text-red-700",
                        )}
                      >
                        {formatMoney(row.cashDifferenceTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <Banknote className="mx-auto size-8 text-[#0b7a4b]" />
                      <p className="mt-3 font-black">
                        Aucune donnée financière trouvée
                      </p>
                      <p className="text-muted mt-1">
                        Encaissez des ventes ou modifiez les filtres.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
