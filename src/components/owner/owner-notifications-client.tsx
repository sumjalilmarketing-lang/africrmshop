"use client";

import {
  Bell,
  CheckCircle2,
  Download,
  Filter,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { downloadCsvFile } from "@/lib/csv-export";
import type {
  OwnerNotification,
  OwnerNotificationPriority,
  OwnerNotificationType,
} from "@/lib/owner-notifications";
import { cn } from "@/lib/utils";

export type OwnerNotificationBusiness = {
  id: string;
  name: string;
};

export type OwnerNotificationStore = {
  id: string;
  businessId: string;
  name: string;
};

export type OwnerNotificationItem = OwnerNotification & {
  businessName: string;
  storeName: string;
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

const priorityLabels: Record<OwnerNotificationPriority, string> = {
  high: "Haute",
  medium: "Moyenne",
  low: "Faible",
};

const typeLabels: Record<OwnerNotificationType, string> = {
  risk: "Contrôle",
  expense_due: "Échéance dépense",
  expense_pending: "Dépense à valider",
  expense_rejected: "Dépense rejetée",
  system: "Système",
  other: "Autre",
};

function formatMoney(value: number | null) {
  if (value === null) return "—";

  return moneyFormatter.format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
}

function getPriorityClass(priority: OwnerNotificationPriority) {
  if (priority === "high") return "bg-red-50 text-red-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";

  return "bg-emerald-50 text-emerald-700";
}

function getSafeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function OwnerNotificationsClient({
  businesses,
  stores,
  notifications,
}: Readonly<{
  businesses: OwnerNotificationBusiness[];
  stores: OwnerNotificationStore[];
  notifications: OwnerNotificationItem[];
}>) {
  const [notificationItems, setNotificationItems] = useState(notifications);
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [storeId, setStoreId] = useState("all");
  const [priority, setPriority] = useState<OwnerNotificationPriority | "all">(
    "all",
  );
  const [type, setType] = useState<OwnerNotificationType | "all">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">(
    "all",
  );
  const [isPending, startTransition] = useTransition();

  const filteredStores = stores.filter(
    (store) => store.businessId === businessId,
  );
  const filteredNotifications = useMemo(
    () =>
      notificationItems.filter((notification) => {
        if (businessId && notification.businessId !== businessId) return false;
        if (storeId === "none" && notification.storeId !== null) return false;
        if (
          storeId !== "all" &&
          storeId !== "none" &&
          notification.storeId !== storeId
        ) {
          return false;
        }
        if (priority !== "all" && notification.priority !== priority) {
          return false;
        }
        if (type !== "all" && notification.type !== type) return false;
        if (readFilter === "unread" && notification.isRead) return false;
        if (readFilter === "read" && !notification.isRead) return false;

        return true;
      }),
    [businessId, notificationItems, priority, readFilter, storeId, type],
  );
  const selectedBusiness =
    businesses.find((business) => business.id === businessId)?.name ??
    "Toutes entreprises";
  const totals = filteredNotifications.reduce(
    (accumulator, notification) => ({
      high: accumulator.high + (notification.priority === "high" ? 1 : 0),
      medium: accumulator.medium + (notification.priority === "medium" ? 1 : 0),
      low: accumulator.low + (notification.priority === "low" ? 1 : 0),
      amount: accumulator.amount + Math.abs(notification.amount ?? 0),
      unread: accumulator.unread + (!notification.isRead ? 1 : 0),
    }),
    { high: 0, medium: 0, low: 0, amount: 0, unread: 0 },
  );

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setStoreId("all");
  }

  function exportFilteredNotifications() {
    const filename = [
      "africrm-notifications-owner",
      getSafeFilePart(selectedBusiness),
    ].join("-");

    downloadCsvFile(filename, [
      [
        "Date",
        "Priorite",
        "Type",
        "Entreprise",
        "Boutique",
        "Titre",
        "Description",
        "Montant",
        "Statut lecture",
        "Action",
      ],
      ...filteredNotifications.map((notification) => [
        notification.occurredAt,
        priorityLabels[notification.priority],
        typeLabels[notification.type],
        notification.businessName,
        notification.storeName,
        notification.title,
        notification.description,
        notification.amount ?? "",
        notification.isRead ? "Lue" : "Non lue",
        notification.actionLabel,
      ]),
    ]);
  }

  function updateReadState(notification: OwnerNotificationItem, read: boolean) {
    if (!notification.persistedId || !notification.canMarkRead) return;

    const previousItems = notificationItems;
    setNotificationItems((currentItems) =>
      currentItems.map((item) =>
        item.id === notification.id ? { ...item, isRead: read } : item,
      ),
    );

    startTransition(async () => {
      const response = await fetch(
        `/api/owner/notifications/${notification.persistedId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read }),
        },
      );

      if (!response.ok) {
        setNotificationItems(previousItems);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Non lues</p>
            <TriangleAlert className="size-5 text-red-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-red-700">
            {totals.unread}
          </p>
          <p className="text-muted mt-1 text-xs">notifications à traiter</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Priorité moyenne</p>
            <Bell className="size-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-black text-amber-700">
            {totals.medium}
          </p>
          <p className="text-muted mt-1 text-xs">à suivre aujourd’hui</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Montant exposé</p>
            <Filter className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">
            {formatMoney(totals.amount)}
          </p>
          <p className="text-muted mt-1 text-xs">valeur indicative</p>
        </article>
        <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-muted text-xs font-bold">Signal faible</p>
            <CheckCircle2 className="size-5 text-[#0b7a4b]" />
          </div>
          <p className="mt-3 text-2xl font-black">{totals.low}</p>
          <p className="text-muted mt-1 text-xs">non critique</p>
        </article>
      </section>

      <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
        <div className="grid gap-3 md:grid-cols-7">
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
              <option value="none">Non affectée</option>
              {filteredStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Priorité
            <select
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target.value as OwnerNotificationPriority | "all",
                )
              }
              className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
            >
              <option value="all">Toutes</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>
          </label>
          <label className="block text-xs font-bold">
            Type
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as OwnerNotificationType | "all")
              }
              className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
            >
              <option value="all">Tous</option>
              <option value="risk">Contrôle</option>
              <option value="expense_due">Échéance</option>
              <option value="expense_pending">À valider</option>
              <option value="expense_rejected">Rejetée</option>
              <option value="system">Système</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <label className="block text-xs font-bold">
            Statut
            <select
              value={readFilter}
              onChange={(event) =>
                setReadFilter(event.target.value as "all" | "unread" | "read")
              }
              className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 text-sm outline-none focus:border-[#0b7a4b]"
            >
              <option value="all">Toutes</option>
              <option value="unread">Non lues</option>
              <option value="read">Lues</option>
            </select>
          </label>
          <button
            type="button"
            onClick={exportFilteredNotifications}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-4 text-xs font-black text-white transition hover:bg-[#0b7a4b]"
          >
            <Download className="size-4" />
            CSV
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {filteredNotifications.map((notification) => (
          <article
            key={notification.id}
            className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-black",
                      getPriorityClass(notification.priority),
                    )}
                  >
                    {priorityLabels[notification.priority]}
                  </span>
                  <span className="rounded-full bg-[#f3f7f4] px-3 py-1 text-[11px] font-black text-[#5c6f66]">
                    {typeLabels[notification.type]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-black",
                      notification.isRead
                        ? "bg-slate-100 text-slate-600"
                        : "bg-blue-50 text-blue-700",
                    )}
                  >
                    {notification.isRead ? "Lue" : "Non lue"}
                  </span>
                  <span className="text-muted text-xs">
                    {formatDate(notification.occurredAt)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-black">
                  {notification.title}
                </h2>
                <p className="text-muted mt-1 max-w-3xl text-sm leading-6">
                  {notification.description}
                </p>
                <p className="text-muted mt-3 text-xs">
                  {notification.businessName} · {notification.storeName} ·{" "}
                  {formatMoney(notification.amount)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {notification.canMarkRead ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      updateReadState(notification, !notification.isRead)
                    }
                    className="inline-flex items-center justify-center rounded-2xl border border-[#dbe4dd] px-4 py-3 text-xs font-black text-[#14251d] transition hover:bg-[#f3f7f4] disabled:opacity-60"
                  >
                    {notification.isRead ? "Marquer non lue" : "Marquer lue"}
                  </button>
                ) : null}
                <Link
                  href={notification.actionHref}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#0b7a4b] px-4 py-3 text-xs font-black text-white"
                >
                  {notification.actionLabel}
                </Link>
              </div>
            </div>
          </article>
        ))}
        {!filteredNotifications.length && (
          <section className="rounded-3xl border border-dashed border-[#bdd6c6] bg-white p-10 text-center">
            <Bell className="mx-auto size-8 text-[#0b7a4b]" />
            <h2 className="mt-4 text-xl font-black">Aucune notification</h2>
            <p className="text-muted mx-auto mt-2 max-w-lg text-sm">
              Aucun événement prioritaire ne correspond aux filtres actuels.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
