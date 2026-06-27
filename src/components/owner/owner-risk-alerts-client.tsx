"use client";

import {
  AlertTriangle,
  Download,
  Eye,
  Filter,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import type {
  RiskAlert,
  RiskAlertType,
  RiskSeverity,
} from "@/lib/owner-risk-alerts";
import { cn } from "@/lib/utils";

export type OwnerRiskBusiness = {
  id: string;
  name: string;
};

export type OwnerRiskStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerRiskAlert = RiskAlert & {
  businessName: string;
  storeName: string;
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const typeLabels: Record<RiskAlertType, string> = {
  cash_difference: "Écart caisse",
  incomplete_payment: "Paiement incomplet",
  after_sale: "Après-vente",
  stock_adjustment: "Ajustement stock",
};

const severityLabels: Record<RiskSeverity, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
};

function formatMoney(value: number | null) {
  if (value === null) return "—";

  return moneyFormatter.format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSeverityClass(severity: RiskSeverity) {
  if (severity === "high") return "bg-red-50 text-red-700";
  if (severity === "medium") return "bg-amber-50 text-amber-700";

  return "bg-emerald-50 text-emerald-700";
}

function getSafeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OwnerRiskAlertsClient({
  businesses,
  stores,
  alerts,
}: Readonly<{
  businesses: OwnerRiskBusiness[];
  stores: OwnerRiskStore[];
  alerts: OwnerRiskAlert[];
}>) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [severity, setSeverity] = useState<RiskSeverity | "all">("all");
  const [type, setType] = useState<RiskAlertType | "all">("all");

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (businessId && alert.businessId !== businessId) return false;
        if (storeId !== "all" && alert.storeId !== storeId) return false;
        if (severity !== "all" && alert.severity !== severity) return false;
        if (type !== "all" && alert.type !== type) return false;

        return true;
      }),
    [alerts, businessId, severity, storeId, type],
  );
  const selectedBusiness =
    businesses.find((business) => business.id === businessId)?.name ??
    "Toutes entreprises";
  const totals = filteredAlerts.reduce(
    (accumulator, alert) => ({
      high: accumulator.high + (alert.severity === "high" ? 1 : 0),
      medium: accumulator.medium + (alert.severity === "medium" ? 1 : 0),
      low: accumulator.low + (alert.severity === "low" ? 1 : 0),
      cashDifference:
        accumulator.cashDifference +
        (alert.type === "cash_difference" ? Math.abs(alert.amount ?? 0) : 0),
    }),
    { high: 0, medium: 0, low: 0, cashDifference: 0 },
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
  }

  function exportFilteredAlerts() {
    const filename = [
      "africrm-controle-anti-fraude",
      getSafeFilePart(selectedBusiness),
    ].join("-");

    downloadCsvFile(filename, [
      [
        "Date",
        "Entreprise",
        "Boutique",
        "Severite",
        "Type",
        "Source",
        "Titre",
        "Description",
        "Montant",
        "Quantite",
      ],
      ...filteredAlerts.map((alert) => [
        alert.occurredAt,
        alert.businessName,
        alert.storeName,
        severityLabels[alert.severity],
        typeLabels[alert.type],
        alert.sourceLabel,
        alert.title,
        alert.description,
        alert.amount ?? "",
        alert.quantity ?? "",
      ]),
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Alertes élevées</p>
            <ShieldAlert className="size-5 text-red-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-red-700">{totals.high}</p>
          <p className="text-muted mt-1 text-xs">à contrôler en priorité</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Alertes moyennes</p>
            <AlertTriangle className="size-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-amber-700">
            {totals.medium}
          </p>
          <p className="text-muted mt-1 text-xs">risques à suivre</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Écarts caisse</p>
            <Eye className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(totals.cashDifference)}
          </p>
          <p className="text-muted mt-1 text-xs">valeur absolue détectée</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Contrôles faibles</p>
            <ShieldCheck className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">{totals.low}</p>
          <p className="text-muted mt-1 text-xs">signaux non critiques</p>
        </article>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Filtres de contrôle</h2>
            <p className="text-muted mt-1 text-xs">
              Priorisez les anomalies par entreprise, boutique, sévérité et
              nature du risque.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-6 xl:min-w-[1080px]">
            <label className="block text-xs font-bold md:col-span-2">
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
              Sévérité
              <select
                value={severity}
                onChange={(event) =>
                  setSeverity(event.target.value as RiskSeverity | "all")
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="all">Toutes</option>
                <option value="high">Élevée</option>
                <option value="medium">Moyenne</option>
                <option value="low">Faible</option>
              </select>
            </label>
            <label className="block text-xs font-bold">
              Type
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as RiskAlertType | "all")
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
              >
                <option value="all">Tous</option>
                <option value="cash_difference">Écart caisse</option>
                <option value="incomplete_payment">Paiement incomplet</option>
                <option value="after_sale">Après-vente</option>
                <option value="stock_adjustment">Ajustement stock</option>
              </select>
            </label>
            <button
              type="button"
              onClick={exportFilteredAlerts}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white transition hover:bg-[#0b7a4b]"
            >
              <Download className="size-4" />
              CSV
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#e1e7e3] bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-[#e1e7e3] p-6">
          <div>
            <h2 className="text-lg font-bold">File de contrôle</h2>
            <p className="text-muted mt-1 text-xs">
              Liste des signaux à vérifier. Une alerte n’est pas une preuve de
              fraude : c’est une priorité de contrôle.
            </p>
          </div>
          <Filter className="size-5 text-[#0b7a4b]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-[#f7faf8] text-xs text-[#5c6f66] uppercase">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Sévérité</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Entreprise</th>
                <th className="px-5 py-4">Boutique</th>
                <th className="px-5 py-4">Source</th>
                <th className="px-5 py-4">Détail</th>
                <th className="px-5 py-4 text-right">Montant</th>
                <th className="px-5 py-4 text-right">Quantité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-5 py-4 font-bold">
                    {formatDate(alert.occurredAt)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-black",
                        getSeverityClass(alert.severity),
                      )}
                    >
                      {severityLabels[alert.severity]}
                    </span>
                  </td>
                  <td className="px-5 py-4">{typeLabels[alert.type]}</td>
                  <td className="px-5 py-4">{alert.businessName}</td>
                  <td className="px-5 py-4">{alert.storeName}</td>
                  <td className="px-5 py-4 font-bold">{alert.sourceLabel}</td>
                  <td className="max-w-[360px] px-5 py-4">
                    <p className="font-bold">{alert.title}</p>
                    <p className="text-muted mt-1 text-xs leading-5">
                      {alert.description}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">
                    {formatMoney(alert.amount)}
                  </td>
                  <td className="px-5 py-4 text-right font-bold">
                    {alert.quantity ?? "—"}
                  </td>
                </tr>
              ))}
              {!filteredAlerts.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-sm text-[#5c6f66]"
                  >
                    Aucun signal de risque trouvé pour ces filtres.
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
