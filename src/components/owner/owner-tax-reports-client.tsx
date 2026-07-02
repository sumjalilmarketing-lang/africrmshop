"use client";

import {
  AlertTriangle,
  CalendarDays,
  Download,
  Landmark,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import { buildOwnerTaxSummary } from "@/lib/owner-tax-summary";
import type { TaxReportPeriod, TaxReportRow } from "@/lib/owner-tax-reports";
import { cn } from "@/lib/utils";

export type OwnerTaxBusiness = {
  id: string;
  name: string;
};

export type OwnerTaxStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerTaxReportRow = TaxReportRow & {
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

function formatPeriod(value: string, periodType: TaxReportPeriod) {
  if (periodType === "quarter") return value.replace("-Q", " · T");

  return new Intl.DateTimeFormat("fr-SN", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
}

function getSafeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OwnerTaxReportsClient({
  businesses,
  stores,
  monthlyRows,
  quarterlyRows,
}: Readonly<{
  businesses: OwnerTaxBusiness[];
  stores: OwnerTaxStore[];
  monthlyRows: OwnerTaxReportRow[];
  quarterlyRows: OwnerTaxReportRow[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [periodType, setPeriodType] = useState<TaxReportPeriod>("month");
  const [period, setPeriod] = useState("");

  const rows = periodType === "month" ? monthlyRows : quarterlyRows;
  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (businessId && row.businessId !== businessId) return false;
        if (storeId === "none" && row.storeId !== null) return false;
        if (
          storeId !== "all" &&
          storeId !== "none" &&
          row.storeId !== storeId
        ) {
          return false;
        }
        if (period && row.periodKey !== period) return false;

        return true;
      }),
    [businessId, period, rows, storeId],
  );
  const selectedBusiness =
    businesses.find((business) => business.id === businessId)?.name ??
    "Toutes entreprises";
  const taxSummary = useMemo(
    () => buildOwnerTaxSummary(filteredRows),
    [filteredRows],
  );
  const periodOptions = [...new Set(rows.map((row) => row.periodKey))].sort(
    (first, second) => second.localeCompare(first),
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
  }

  function changePeriodType(nextPeriodType: TaxReportPeriod) {
    setPeriodType(nextPeriodType);
    setPeriod("");
  }

  function exportFilteredRows() {
    const filename = [
      "africrm-tva-fiscalite",
      periodType === "month" ? "mensuel" : "trimestriel",
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
        "Avoirs annulations remboursements",
        "Depenses deductibles",
        "Base taxable ventes",
        "TVA collectee",
        "TVA annulee remboursee",
        "Depenses HT deductibles",
        "TVA deductible",
        "TVA nette due",
      ],
      ...filteredRows.map((row) => [
        row.periodKey,
        row.businessName,
        row.storeName,
        row.completedSalesCount,
        row.afterSaleCount,
        row.deductibleExpenseCount,
        row.taxableSalesTotal,
        row.outputTaxTotal,
        row.reversedOutputTaxTotal,
        row.deductibleExpenseTotal,
        row.inputTaxTotal,
        row.netTaxDue,
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">TVA collectée nette</p>
            <ReceiptText className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(taxSummary.netCollectedTax)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {formatMoney(taxSummary.reversedOutputTaxTotal)} annulée/remboursée
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Taux effectif</p>
            <ShieldCheck
              className={cn(
                "size-5",
                taxSummary.effectiveTaxRate >= 15 &&
                  taxSummary.effectiveTaxRate <= 20
                  ? "text-[#0b7a4b]"
                  : "text-amber-600",
              )}
            />
          </div>
          <p className="mt-3 text-2xl font-black">
            {taxSummary.effectiveTaxRate}%
          </p>
          <p className="text-muted mt-1 text-xs">
            couverture déductible {taxSummary.deductibleCoverageRate}%
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">TVA déductible</p>
            <ShieldCheck className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(taxSummary.inputTaxTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {taxSummary.deductibleExpenseCount} dépenses validées/payées
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">TVA nette estimée</p>
            <Landmark className="size-5 text-[#0b7a4b]" />
          </div>
          <p
            className={cn(
              "mt-3 text-2xl font-black",
              taxSummary.netTaxDue < 0 ? "text-[#0b7a4b]" : "text-[#14251d]",
            )}
          >
            {formatMoney(taxSummary.netTaxDue)}
          </p>
          <p className="text-muted mt-1 text-xs">
            à contrôler avant déclaration
          </p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Base taxable</p>
            <CalendarDays className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(taxSummary.taxableSalesTotal)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {taxSummary.completedSalesCount} tickets encaissés
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="text-sm font-black text-amber-900">
              Assistant fiscal, pas une déclaration officielle
            </h2>
            <p className="mt-1 text-xs leading-6 text-amber-900/80">
              AFRICRM prépare les chiffres utiles à la TVA à partir des ventes
              et dépenses enregistrées. Le propriétaire doit faire valider les
              montants définitifs par son comptable ou son conseil fiscal.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Filtres TVA</h2>
            <p className="text-muted mt-1 text-xs">
              Analysez la TVA par entreprise, boutique et période fiscale.
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
                <option value="none">Non affectée</option>
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
                  changePeriodType(event.target.value as TaxReportPeriod)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="month">Mensuelle</option>
                <option value="quarter">Trimestrielle</option>
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
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white transition hover:bg-[#0b7a4b]"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#e1e7e3] bg-white shadow-sm">
        <div className="border-b border-[#e1e7e3] p-6">
          <h2 className="text-lg font-bold">Synthèse fiscale</h2>
          <p className="text-muted mt-1 text-xs">
            Calculs estimatifs basés sur les ventes terminées, annulations,
            remboursements et dépenses approuvées ou payées.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-[#f7faf8] text-xs text-[#5c6f66] uppercase">
              <tr>
                <th className="px-5 py-4">Période</th>
                <th className="px-5 py-4">Entreprise</th>
                <th className="px-5 py-4">Boutique</th>
                <th className="px-5 py-4 text-right">Base taxable</th>
                <th className="px-5 py-4 text-right">TVA collectée</th>
                <th className="px-5 py-4 text-right">TVA annulée</th>
                <th className="px-5 py-4 text-right">TVA déductible</th>
                <th className="px-5 py-4 text-right">TVA nette</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {filteredRows.map((row) => (
                <tr key={`${row.periodKey}-${row.businessId}-${row.storeId}`}>
                  <td className="px-5 py-4 font-bold">
                    {formatPeriod(row.periodKey, row.periodType)}
                  </td>
                  <td className="px-5 py-4">{row.businessName}</td>
                  <td className="px-5 py-4">{row.storeName}</td>
                  <td className="px-5 py-4 text-right font-bold">
                    {formatMoney(row.taxableSalesTotal)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(row.outputTaxTotal)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(row.reversedOutputTaxTotal)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {formatMoney(row.inputTaxTotal)}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-4 text-right font-black",
                      row.netTaxDue < 0 ? "text-[#0b7a4b]" : "text-[#14251d]",
                    )}
                  >
                    {formatMoney(row.netTaxDue)}
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-[#5c6f66]"
                  >
                    Aucun mouvement fiscal trouvé pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
