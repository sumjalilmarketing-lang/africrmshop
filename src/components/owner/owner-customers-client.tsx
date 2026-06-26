"use client";

import {
  CalendarDays,
  Loader2,
  MessageSquarePlus,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type OwnerCustomerBusiness = {
  id: string;
  name: string;
};

export type OwnerCustomerItem = {
  id: string;
  businessId: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  createdAt: string;
  totalSpent: number;
  saleCount: number;
  lastSaleAt: string | null;
};

export type OwnerCustomerSale = {
  id: string;
  businessId: string;
  customerId: string;
  storeName: string;
  receiptNumber: string;
  totalAmount: number;
  createdAt: string;
};

export type OwnerCustomerNote = {
  id: string;
  businessId: string;
  customerId: string;
  note: string;
  createdAt: string;
};

const currencyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function toMoney(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Jamais";

  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function normalize(value: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function OwnerCustomersClient({
  businesses,
  customers,
  sales,
  notes,
}: Readonly<{
  businesses: OwnerCustomerBusiness[];
  customers: OwnerCustomerItem[];
  sales: OwnerCustomerSale[];
  notes: OwnerCustomerNote[];
}>) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<"all" | "vip" | "recent" | "inactive">(
    "all",
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    customers.find((customer) => customer.businessId === businesses[0]?.id)
      ?.id ?? "",
  );
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [referenceTime] = useState(() => Date.now());

  const filteredCustomers = useMemo(() => {
    const search = normalize(query.trim());
    return customers.filter((customer) => {
      if (businessId && customer.businessId !== businessId) return false;
      if (segment === "vip" && customer.totalSpent < 50_000) return false;
      if (
        segment === "recent" &&
        (!customer.lastSaleAt ||
          referenceTime - new Date(customer.lastSaleAt).getTime() >
            30 * 24 * 60 * 60 * 1000)
      ) {
        return false;
      }
      if (
        segment === "inactive" &&
        customer.lastSaleAt &&
        referenceTime - new Date(customer.lastSaleAt).getTime() <=
          60 * 24 * 60 * 60 * 1000
      ) {
        return false;
      }
      if (!search) return true;

      return [
        customer.name,
        customer.phone,
        customer.email,
        customer.code,
      ].some((value) => normalize(value).includes(search));
    });
  }, [businessId, customers, query, referenceTime, segment]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ??
    filteredCustomers[0] ??
    null;
  const selectedSales = selectedCustomer
    ? sales.filter((sale) => sale.customerId === selectedCustomer.id)
    : [];
  const selectedNotes = selectedCustomer
    ? notes.filter((note) => note.customerId === selectedCustomer.id)
    : [];
  const businessCustomers = customers.filter(
    (customer) => !businessId || customer.businessId === businessId,
  );
  const totalSpent = businessCustomers.reduce(
    (total, customer) => total + customer.totalSpent,
    0,
  );
  const vipCount = businessCustomers.filter(
    (customer) => customer.totalSpent >= 50_000,
  ).length;
  const activeCount = businessCustomers.filter((customer) => {
    if (!customer.lastSaleAt) return false;
    return (
      referenceTime - new Date(customer.lastSaleAt).getTime() <=
      30 * 24 * 60 * 60 * 1000
    );
  }).length;

  function changeBusiness(nextBusinessId: string) {
    setBusinessId(nextBusinessId);
    setQuery("");
    setSegment("all");
    setSelectedCustomerId(
      customers.find((customer) => customer.businessId === nextBusinessId)
        ?.id ?? "",
    );
    setStatus(null);
  }

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCustomer || isSavingNote) return;

    setStatus(null);
    setIsSavingNote(true);
    const response = await fetch("/api/owner/customer-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: selectedCustomer.businessId,
        customerId: selectedCustomer.id,
        note: noteText,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setIsSavingNote(false);

    if (!response.ok) {
      setStatus({
        type: "error",
        message: payload?.error ?? "La note n'a pas pu être enregistrée.",
      });
      return;
    }

    setStatus({ type: "success", message: "Note client enregistrée." });
    setNoteText("");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs font-bold">Clients</p>
              <UserRound className="size-5 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-3xl font-black">
              {businessCustomers.length}
            </p>
          </article>
          <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs font-bold">CA client</p>
              <WalletCards className="size-5 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">{toMoney(totalSpent)}</p>
          </article>
          <article className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted text-xs font-bold">VIP / actifs</p>
              <Sparkles className="size-5 text-amber-600" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {vipCount} / {activeCount}
            </p>
          </article>
        </div>

        <div className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm">
          <div className="grid gap-3">
            <label className="block text-xs font-bold">
              Entreprise
              <select
                value={businessId}
                onChange={(event) => changeBusiness(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="relative block">
              <Search className="text-muted absolute top-1/2 left-4 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-2xl border border-[#dbe4dd] py-3 pr-4 pl-11 text-sm outline-none focus:border-[#0b7a4b]"
                placeholder="Rechercher nom, téléphone, email..."
              />
            </label>
            <select
              value={segment}
              onChange={(event) =>
                setSegment(event.target.value as typeof segment)
              }
              className="rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
            >
              <option value="all">Tous les clients</option>
              <option value="vip">VIP — 50 000 XOF+</option>
              <option value="recent">Actifs 30 jours</option>
              <option value="inactive">Inactifs 60 jours</option>
            </select>
          </div>

          <div className="mt-5 max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  setSelectedCustomerId(customer.id);
                  setStatus(null);
                }}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  selectedCustomer?.id === customer.id
                    ? "border-[#0b7a4b] bg-[#e9f5ee]"
                    : "border-[#e1e7e3] bg-[#fbfcfb] hover:border-[#0b7a4b]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{customer.name}</p>
                    <p className="text-muted mt-1 text-xs">
                      {customer.phone ??
                        customer.email ??
                        "Contact non renseigné"}
                    </p>
                  </div>
                  <p className="text-xs font-black text-[#0b7a4b]">
                    {toMoney(customer.totalSpent)}
                  </p>
                </div>
                <div className="text-muted mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span>{customer.saleCount} vente(s)</span>
                  <span>{customer.loyaltyPoints} points</span>
                  <span>Dernier : {formatDate(customer.lastSaleAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {!filteredCustomers.length && (
            <p className="text-muted mt-6 text-center text-sm">
              Aucun client ne correspond aux filtres.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        {selectedCustomer ? (
          <>
            <article className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-[#0b7a4b] uppercase">
                    Fiche client
                  </p>
                  <h2 className="mt-2 text-3xl font-black">
                    {selectedCustomer.name}
                  </h2>
                  <div className="text-muted mt-3 flex flex-wrap gap-3 text-xs">
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3.5" />
                        {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.email && (
                      <span>{selectedCustomer.email}</span>
                    )}
                    {selectedCustomer.code && (
                      <span>{selectedCustomer.code}</span>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "w-fit rounded-full px-3 py-1 text-[10px] font-black",
                    selectedCustomer.totalSpent >= 50_000
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  {selectedCustomer.totalSpent >= 50_000 ? "VIP" : "Standard"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-[#f6f8f6] p-4">
                  <p className="text-muted text-[10px] font-bold uppercase">
                    Total dépensé
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {toMoney(selectedCustomer.totalSpent)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f6f8f6] p-4">
                  <p className="text-muted text-[10px] font-bold uppercase">
                    Ventes
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {selectedCustomer.saleCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f6f8f6] p-4">
                  <p className="text-muted text-[10px] font-bold uppercase">
                    Fidélité
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {selectedCustomer.loyaltyPoints}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#f6f8f6] p-4">
                  <p className="text-muted text-[10px] font-bold uppercase">
                    Dernier achat
                  </p>
                  <p className="mt-2 text-sm font-black">
                    {formatDate(selectedCustomer.lastSaleAt)}
                  </p>
                </div>
              </div>
            </article>

            <div className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black">Historique achats</h3>
                    <p className="text-muted mt-1 text-xs">
                      Ventes rattachées au client.
                    </p>
                  </div>
                  <ShoppingBag className="size-5 text-[#0b7a4b]" />
                </div>

                <div className="mt-5 space-y-3">
                  {selectedSales.map((sale) => (
                    <article
                      key={sale.id}
                      className="rounded-2xl border border-[#edf1ee] bg-[#fbfcfb] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{sale.receiptNumber}</p>
                          <p className="text-muted mt-1 text-xs">
                            {sale.storeName} · {formatDate(sale.createdAt)}
                          </p>
                        </div>
                        <p className="font-black text-[#0b7a4b]">
                          {toMoney(sale.totalAmount)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                {!selectedSales.length && (
                  <p className="text-muted mt-6 text-center text-sm">
                    Aucun achat rattaché à ce client.
                  </p>
                )}
              </article>

              <article className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black">Notes client</h3>
                    <p className="text-muted mt-1 text-xs">
                      Préférences, promesses, contexte commercial.
                    </p>
                  </div>
                  <MessageSquarePlus className="size-5 text-[#0b7a4b]" />
                </div>

                {status && (
                  <div
                    className={cn(
                      "mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold",
                      status.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {status.message}
                  </div>
                )}

                <form onSubmit={saveNote} className="mt-5 space-y-3">
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    className="min-h-28 w-full rounded-2xl border border-[#dbe4dd] bg-white px-4 py-3 text-sm outline-none focus:border-[#0b7a4b]"
                    placeholder="Ex : préfère être contacté par WhatsApp, aime les livraisons le matin..."
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSavingNote || noteText.trim().length < 2}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    {isSavingNote && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Enregistrer la note
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  {selectedNotes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-2xl border border-[#edf1ee] bg-[#fbfcfb] p-4"
                    >
                      <p className="text-sm leading-6">{note.note}</p>
                      <p className="text-muted mt-3 flex items-center gap-1 text-[10px]">
                        <CalendarDays className="size-3" />
                        {formatDate(note.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>

                {!selectedNotes.length && (
                  <p className="text-muted mt-6 text-center text-sm">
                    Aucune note pour ce client.
                  </p>
                )}
              </article>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#dbe4dd] bg-white p-10 text-center">
            <UserRound className="mx-auto size-10 text-[#0b7a4b]" />
            <p className="mt-4 text-sm font-black">Aucun client sélectionné</p>
          </div>
        )}
      </section>
    </div>
  );
}
