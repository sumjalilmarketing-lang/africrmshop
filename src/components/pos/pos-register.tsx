"use client";

import {
  ArrowRight,
  BarChart3,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Filter,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  Printer,
  ReceiptText,
  ScanLine,
  Search,
  ShoppingCart,
  Store,
  TrendingUp,
  Trash2,
  UserPlus,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CashSessionPanel,
  type PosCashSession,
} from "@/components/pos/cash-session-panel";

export type PosRegisterStore = {
  id: string;
  businessId: string;
  name: string;
  code: string | null;
  city: string | null;
  businessName: string;
};

export type PosRegisterProduct = {
  id: string;
  storeId: string;
  businessId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  unitPrice: number;
  taxRate: number;
  trackInventory: boolean;
  availableStock: number;
  lowStockThreshold: number | null;
};

export type PosPaymentMethod = {
  id: string;
  businessId: string;
  name: string;
  code: string;
  provider: string;
  requiresReference: boolean;
};

export type PosCustomer = {
  id: string;
  businessId: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  totalSpent: number;
  saleCount: number;
  lastSaleAt: string | null;
};

export type PosRecentSale = {
  id: string;
  receiptNumber: string;
  storeId: string;
  storeName: string;
  businessName: string;
  createdAt: string;
  paymentMethodName: string;
  paymentReference: string | null;
  customerName: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: SaleReceiptLine[];
};

type CartLine = {
  product: PosRegisterProduct;
  quantity: number;
};

type SaleDateFilter = "today" | "7d" | "all";

type SaleReceiptLine = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

type SaleReceipt = {
  saleId: string | null;
  receiptNumber: string;
  issuedAt: string;
  storeName: string;
  businessName: string;
  paymentMethodName: string;
  paymentReference: string | null;
  customerName: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  lines: SaleReceiptLine[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-SN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "XOF",
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalize(value: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isSameLocalDay(value: string, reference = new Date()) {
  const date = new Date(value);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function isWithinLastDays(value: string, days: number) {
  const date = new Date(value).getTime();
  const limit = Date.now() - days * 24 * 60 * 60 * 1000;

  return date >= limit;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPaymentMethodLabel(
  method: PosPaymentMethod | null,
  selectedPaymentCode: string,
) {
  if (method) return method.name;
  if (selectedPaymentCode === "mobile_money") return "Mobile Money";

  return "Espèces";
}

function printReceipt(receipt: SaleReceipt) {
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    window.print();
    return;
  }

  const lines = receipt.lines
    .map(
      (line) => `
        <tr>
          <td>
            <strong>${escapeHtml(line.name)}</strong>
            <span>${escapeHtml(line.sku ?? "Sans référence")}</span>
          </td>
          <td>${line.quantity}</td>
          <td>${formatMoney(line.unitPrice)}</td>
          <td>${formatMoney(line.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Reçu ${escapeHtml(receipt.receiptNumber)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #14251d;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #fff;
          }
          .receipt {
            width: 320px;
            margin: 0 auto;
            padding: 20px 14px;
          }
          .center { text-align: center; }
          .brand {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: -0.04em;
          }
          .muted {
            color: #68736c;
            font-size: 11px;
          }
          .divider {
            border-top: 1px dashed #9eb2a6;
            margin: 14px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            color: #68736c;
            font-size: 10px;
            text-align: left;
            text-transform: uppercase;
          }
          td {
            padding: 7px 0;
            vertical-align: top;
          }
          td:nth-child(2), td:nth-child(3), td:nth-child(4),
          th:nth-child(2), th:nth-child(3), th:nth-child(4) {
            text-align: right;
          }
          td span {
            display: block;
            color: #68736c;
            font-size: 10px;
            margin-top: 2px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 12px;
            margin: 7px 0;
          }
          .total {
            font-size: 18px;
            font-weight: 900;
          }
          .footer {
            margin-top: 18px;
            text-align: center;
            font-size: 11px;
            color: #68736c;
          }
          @media print {
            @page { size: 80mm auto; margin: 5mm; }
            .receipt { width: 100%; }
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          <section class="center">
            <div class="brand">${escapeHtml(receipt.businessName)}</div>
            <div class="muted">${escapeHtml(receipt.storeName)}</div>
            <div class="muted">${escapeHtml(formatDateTime(receipt.issuedAt))}</div>
          </section>
          <div class="divider"></div>
          <section>
            <div class="row">
              <span>Reçu</span>
              <strong>${escapeHtml(receipt.receiptNumber)}</strong>
            </div>
            <div class="row">
              <span>Paiement</span>
              <strong>${escapeHtml(receipt.paymentMethodName)}</strong>
            </div>
            ${
              receipt.customerName
                ? `<div class="row"><span>Client</span><strong>${escapeHtml(receipt.customerName)}</strong></div>`
                : ""
            }
            ${
              receipt.paymentReference
                ? `<div class="row"><span>Référence</span><strong>${escapeHtml(receipt.paymentReference)}</strong></div>`
                : ""
            }
          </section>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Qté</th>
                <th>PU</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${lines}</tbody>
          </table>
          <div class="divider"></div>
          <section>
            <div class="row">
              <span>Sous-total</span>
              <strong>${formatMoney(receipt.subtotal)}</strong>
            </div>
            <div class="row">
              <span>TVA</span>
              <strong>${formatMoney(receipt.taxTotal)}</strong>
            </div>
            <div class="row total">
              <span>Total</span>
              <span>${formatMoney(receipt.total)}</span>
            </div>
          </section>
          <div class="divider"></div>
          <section class="footer">
            Merci pour votre confiance.<br />
            Reçu généré par AFRICRM Shop.
          </section>
        </main>
        <script>
          window.addEventListener("load", () => {
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function PosRegister({
  stores,
  products,
  paymentMethods,
  customers,
  recentSales,
  cashSessions,
}: Readonly<{
  stores: PosRegisterStore[];
  products: PosRegisterProduct[];
  paymentMethods: PosPaymentMethod[];
  customers: PosCustomer[];
  recentSales: PosRecentSale[];
  cashSessions: PosCashSession[];
}>) {
  const router = useRouter();
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [selectedPaymentCode, setSelectedPaymentCode] = useState(
    paymentMethods[0]?.code ?? "cash",
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [saleSearch, setSaleSearch] = useState("");
  const [saleDateFilter, setSaleDateFilter] = useState<SaleDateFilter>("today");
  const [saleStoreFilter, setSaleStoreFilter] = useState("all");
  const [salePaymentFilter, setSalePaymentFilter] = useState("all");

  const selectedStore = stores.find((store) => store.id === selectedStoreId);
  const selectedCashSession =
    cashSessions.find((session) => session.storeId === selectedStoreId) ?? null;
  const selectedBusinessId = selectedStore?.businessId;
  const businessCustomers = customers.filter(
    (customer) =>
      !selectedBusinessId || customer.businessId === selectedBusinessId,
  );
  const selectedCustomer =
    businessCustomers.find((customer) => customer.id === selectedCustomerId) ??
    null;
  const normalizedCustomerSearch = normalize(customerSearch.trim());
  const filteredCustomers = (
    normalizedCustomerSearch
      ? businessCustomers.filter((customer) =>
          [customer.name, customer.phone, customer.email, customer.code].some(
            (value) => normalize(value).includes(normalizedCustomerSearch),
          ),
        )
      : businessCustomers
  ).slice(0, 8);
  const storeProducts = useMemo(
    () => products.filter((product) => product.storeId === selectedStoreId),
    [products, selectedStoreId],
  );
  const filteredProducts = useMemo(() => {
    const search = normalize(query.trim());
    if (!search) return storeProducts;

    return storeProducts.filter((product) =>
      [product.name, product.sku, product.barcode, product.categoryName].some(
        (value) => normalize(value).includes(search),
      ),
    );
  }, [query, storeProducts]);
  const availablePaymentMethods = paymentMethods.filter(
    (method) => !selectedBusinessId || method.businessId === selectedBusinessId,
  );
  const selectedPaymentMethod =
    availablePaymentMethods.find(
      (method) => method.code === selectedPaymentCode,
    ) ?? null;
  const subtotal = cart.reduce(
    (total, line) => total + line.product.unitPrice * line.quantity,
    0,
  );
  const taxTotal = cart.reduce(
    (total, line) =>
      total +
      line.product.unitPrice * line.quantity * (line.product.taxRate / 100),
    0,
  );
  const total = subtotal + taxTotal;
  const accessibleRecentSales = useMemo(() => {
    const storeIds = new Set(stores.map((store) => store.id));

    return recentSales.filter((sale) => storeIds.has(sale.storeId));
  }, [recentSales, stores]);
  const salePaymentOptions = useMemo(
    () =>
      [
        ...new Set(accessibleRecentSales.map((sale) => sale.paymentMethodName)),
      ].sort((first, second) => first.localeCompare(second)),
    [accessibleRecentSales],
  );
  const filteredRecentSales = useMemo(() => {
    const search = normalize(saleSearch.trim());
    const matchesDateFilter = (sale: PosRecentSale) => {
      if (saleDateFilter === "today") return isSameLocalDay(sale.createdAt);
      if (saleDateFilter === "7d") return isWithinLastDays(sale.createdAt, 7);

      return true;
    };

    return accessibleRecentSales.filter((sale) => {
      const matchesSearch =
        !search ||
        [
          sale.receiptNumber,
          sale.storeName,
          sale.businessName,
          sale.paymentMethodName,
          sale.customerName,
        ].some((value) => normalize(value).includes(search));
      const matchesStore =
        saleStoreFilter === "all" || sale.storeId === saleStoreFilter;
      const matchesPayment =
        salePaymentFilter === "all" ||
        sale.paymentMethodName === salePaymentFilter;

      return (
        matchesSearch &&
        matchesStore &&
        matchesPayment &&
        matchesDateFilter(sale)
      );
    });
  }, [
    accessibleRecentSales,
    saleDateFilter,
    salePaymentFilter,
    saleSearch,
    saleStoreFilter,
  ]);
  const todaySales = useMemo(
    () =>
      accessibleRecentSales.filter((sale) => isSameLocalDay(sale.createdAt)),
    [accessibleRecentSales],
  );
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const todayAverageBasket =
    todaySales.length > 0 ? todayTotal / todaySales.length : 0;
  const filteredTotal = filteredRecentSales.reduce(
    (sum, sale) => sum + sale.total,
    0,
  );
  const paymentBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const sale of filteredRecentSales) {
      totals.set(
        sale.paymentMethodName,
        (totals.get(sale.paymentMethodName) ?? 0) + sale.total,
      );
    }

    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 3);
  }, [filteredRecentSales]);
  const bestProduct = useMemo(() => {
    const totals = new Map<
      string,
      { name: string; quantity: number; amount: number }
    >();
    for (const sale of filteredRecentSales) {
      for (const line of sale.lines) {
        const current = totals.get(line.name) ?? {
          name: line.name,
          quantity: 0,
          amount: 0,
        };
        totals.set(line.name, {
          name: line.name,
          quantity: current.quantity + line.quantity,
          amount: current.amount + line.lineTotal,
        });
      }
    }

    return (
      [...totals.values()].sort(
        (first, second) => second.amount - first.amount,
      )[0] ?? null
    );
  }, [filteredRecentSales]);

  function resetForStore(storeId: string) {
    setSelectedStoreId(storeId);
    setCart([]);
    setQuery("");
    const businessId = stores.find((store) => store.id === storeId)?.businessId;
    const defaultPayment =
      paymentMethods.find((method) => method.businessId === businessId)?.code ??
      "cash";
    setSelectedPaymentCode(defaultPayment);
    setPaymentReference("");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setCustomerError(null);
    setCheckoutError(null);
    setCheckoutSuccess(null);
    setReceipt(null);
  }

  function canAdd(product: PosRegisterProduct) {
    if (!product.trackInventory) return true;
    const currentQuantity =
      cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
    return product.availableStock > currentQuantity;
  }

  function addProduct(product: PosRegisterProduct) {
    if (!canAdd(product)) return;

    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.product.id !== productId) return [line];
        if (quantity <= 0) return [];

        const nextQuantity = line.product.trackInventory
          ? Math.min(quantity, line.product.availableStock)
          : quantity;

        return [{ ...line, quantity: nextQuantity }];
      }),
    );
  }

  function clearCart() {
    setCart([]);
    setCheckoutError(null);
    setCheckoutSuccess(null);
  }

  function openRecentSaleReceipt(sale: PosRecentSale) {
    setReceipt({
      saleId: sale.id,
      receiptNumber: sale.receiptNumber,
      issuedAt: sale.createdAt,
      storeName: sale.storeName,
      businessName: sale.businessName,
      paymentMethodName: sale.paymentMethodName,
      paymentReference: sale.paymentReference,
      customerName: sale.customerName,
      subtotal: sale.subtotal,
      taxTotal: sale.taxTotal,
      total: sale.total,
      lines: sale.lines,
    });
  }

  async function createCustomer() {
    if (!selectedStoreId || isCreatingCustomer) return;

    const [firstName, ...rest] = newCustomerName.trim().split(/\s+/);
    const lastName = rest.join(" ");
    setCustomerError(null);
    setIsCreatingCustomer(true);

    const response = await fetch("/api/pos/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStoreId,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: newCustomerPhone.trim() || undefined,
      }),
    }).catch(() => null);

    setIsCreatingCustomer(false);
    if (!response) {
      setCustomerError("Impossible de joindre le serveur client.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      customer?: {
        id: string;
      };
    } | null;

    if (!response.ok || !payload?.customer?.id) {
      setCustomerError(payload?.error ?? "Le client n'a pas pu être créé.");
      return;
    }

    setSelectedCustomerId(payload.customer.id);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setCustomerSearch("");
    router.refresh();
  }

  async function checkout() {
    if (!selectedStoreId || cart.length === 0 || isSubmitting) return;
    if (!selectedCashSession) {
      setCheckoutError("Ouvrez une session de caisse avant d'encaisser.");
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);
    setReceipt(null);

    const cartSnapshot = cart;
    const paymentReferenceSnapshot = paymentReference.trim();
    const paymentMethodName = getPaymentMethodLabel(
      selectedPaymentMethod,
      selectedPaymentCode,
    );
    const receiptLines = cartSnapshot.map((line) => {
      const taxAmount =
        line.product.unitPrice * line.quantity * (line.product.taxRate / 100);

      return {
        id: line.product.id,
        name: line.product.name,
        sku: line.product.sku ?? line.product.barcode,
        quantity: line.quantity,
        unitPrice: line.product.unitPrice,
        taxRate: line.product.taxRate,
        taxAmount,
        lineTotal: line.product.unitPrice * line.quantity + taxAmount,
      };
    });
    const receiptSubtotal = receiptLines.reduce(
      (total, line) => total + line.unitPrice * line.quantity,
      0,
    );
    const receiptTaxTotal = receiptLines.reduce(
      (total, line) => total + line.taxAmount,
      0,
    );
    const receiptTotal = receiptSubtotal + receiptTaxTotal;

    const response = await fetch("/api/pos/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStoreId,
        customerId: selectedCustomer?.id ?? null,
        paymentMethodId: selectedPaymentMethod?.id ?? null,
        paymentProvider: selectedPaymentMethod?.provider ?? selectedPaymentCode,
        paymentReference: paymentReferenceSnapshot || undefined,
        items: cartSnapshot.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      }),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response) {
      setCheckoutError("Impossible de joindre le serveur de caisse.");
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      saleId?: string;
      receiptNumber?: string;
      totalAmount?: number;
    } | null;

    if (!response.ok) {
      setCheckoutError(
        payload?.error ?? "La vente n’a pas pu être enregistrée.",
      );
      return;
    }

    setCart([]);
    setPaymentReference("");
    setReceipt({
      saleId: payload?.saleId ?? null,
      receiptNumber: payload?.receiptNumber ?? "POS",
      issuedAt: new Date().toISOString(),
      storeName: selectedStore?.name ?? "Point de vente",
      businessName: selectedStore?.businessName ?? "AFRICRM Shop",
      paymentMethodName,
      paymentReference: paymentReferenceSnapshot || null,
      customerName: selectedCustomer?.name ?? null,
      subtotal: receiptSubtotal,
      taxTotal: receiptTaxTotal,
      total: payload?.totalAmount ?? receiptTotal,
      lines: receiptLines,
    });
    setCheckoutSuccess(
      `Vente encaissée avec succès · Reçu ${payload?.receiptNumber ?? "POS"}`,
    );
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#edf3ef] text-[#14251d]">
      <header className="border-b border-[#dbe6df] bg-white/95 px-5 py-4 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-[#0b7a4b] uppercase">
              AFRICRM POS
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">
              Caisse intelligente
            </h1>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] px-4 py-3 text-xs">
            <Store className="size-4 text-[#0b7a4b]" />
            <div>
              <p className="font-bold">
                {selectedStore?.name ?? "Aucune boutique active"}
              </p>
              <p className="text-[#68736c]">
                {selectedStore?.businessName ?? "POS verrouillé"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1fr_410px] lg:px-8">
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => resetForStore(store.id)}
                className={cn(
                  "rounded-3xl border bg-white p-5 text-left shadow-sm transition",
                  store.id === selectedStoreId
                    ? "border-[#0b7a4b] ring-4 ring-[#0b7a4b]/10"
                    : "border-[#dbe6df] hover:border-[#0b7a4b]/30",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
                    <Store className="size-5" />
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                    Active
                  </span>
                </div>
                <h2 className="mt-4 font-black">{store.name}</h2>
                <p className="mt-1 text-xs text-[#68736c]">
                  {store.businessName} · {store.city ?? "Ville non renseignée"}
                </p>
              </button>
            ))}
          </div>

          {stores.length === 0 ? (
            <section className="rounded-[2rem] border border-dashed border-[#b8cdc0] bg-white p-10 text-center">
              <Store className="mx-auto size-10 text-[#0b7a4b]" />
              <h2 className="mt-5 text-xl font-black">POS indisponible</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68736c]">
                Aucun point de vente actif n’est rattaché à votre accès.
              </p>
            </section>
          ) : (
            <>
              {selectedStore ? (
                <CashSessionPanel
                  cashSession={selectedCashSession}
                  storeId={selectedStore.id}
                  storeName={selectedStore.name}
                  onChanged={() => router.refresh()}
                />
              ) : null}

              <section className="rounded-[2rem] border border-[#dbe6df] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="relative flex-1">
                    <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#68736c]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="h-14 w-full rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] pr-4 pl-11 text-sm font-bold transition outline-none focus:border-[#0b7a4b] focus:bg-white focus:ring-4 focus:ring-[#0b7a4b]/10"
                      placeholder="Rechercher un produit, SKU, code-barres…"
                    />
                  </label>
                  <button className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 text-sm font-black text-white">
                    <ScanLine className="size-4" />
                    Scanner
                  </button>
                </div>
              </section>

              {filteredProducts.length > 0 ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const outOfStock =
                      product.trackInventory && product.availableStock <= 0;
                    const lowStock =
                      product.trackInventory &&
                      product.lowStockThreshold !== null &&
                      product.availableStock > 0 &&
                      product.availableStock <= product.lowStockThreshold;

                    return (
                      <article
                        key={`${product.storeId}-${product.id}`}
                        className="rounded-[2rem] border border-[#dbe6df] bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className="grid size-12 place-items-center rounded-2xl text-white"
                            style={{
                              backgroundColor:
                                product.categoryColor ?? "#0b7a4b",
                            }}
                          >
                            <PackageSearch className="size-5" />
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-[10px] font-black",
                              outOfStock
                                ? "bg-red-50 text-red-700"
                                : lowStock
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700",
                            )}
                          >
                            {product.trackInventory
                              ? `${product.availableStock} en stock`
                              : "Stock libre"}
                          </span>
                        </div>
                        <h3 className="mt-5 font-black">{product.name}</h3>
                        <p className="mt-1 text-xs text-[#68736c]">
                          {product.categoryName ?? "Sans catégorie"} ·{" "}
                          {product.sku ?? product.barcode ?? "Sans référence"}
                        </p>
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-black text-[#0b7a4b]">
                              {formatMoney(product.unitPrice)}
                            </p>
                            <p className="text-[10px] font-bold text-[#68736c]">
                              TVA {product.taxRate}%
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={outOfStock || !canAdd(product)}
                            onClick={() => addProduct(product)}
                            className="grid size-11 place-items-center rounded-2xl bg-[#0b7a4b] text-white disabled:cursor-not-allowed disabled:bg-[#c8d3cc]"
                            aria-label={`Ajouter ${product.name}`}
                          >
                            <Plus className="size-5" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              ) : (
                <section className="rounded-[2rem] border border-dashed border-[#b8cdc0] bg-white p-10 text-center">
                  <PackageSearch className="mx-auto size-10 text-[#0b7a4b]" />
                  <h2 className="mt-5 text-xl font-black">
                    Aucun produit disponible
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68736c]">
                    {query
                      ? "Aucun produit ne correspond à cette recherche."
                      : "Ajoutez des produits et du stock à cette boutique pour les vendre ici."}
                  </p>
                </section>
              )}
            </>
          )}
        </section>

        <aside className="rounded-[2rem] border border-[#dbe6df] bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:self-start">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-[#0b7a4b] uppercase">
                Panier
              </p>
              <h2 className="mt-1 text-xl font-black">Vente en cours</h2>
            </div>
            <span className="grid size-11 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
              <ShoppingCart className="size-5" />
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#c9d8cf] bg-[#f8fbf9] px-5 py-10 text-center">
              <ReceiptText className="mx-auto size-9 text-[#0b7a4b]" />
              <p className="mt-4 text-sm font-black">Panier vide</p>
              <p className="mt-2 text-xs leading-5 text-[#68736c]">
                Ajoutez des produits pour préparer la vente.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {cart.map((line) => (
                <article
                  key={line.product.id}
                  className="rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black">
                        {line.product.name}
                      </h3>
                      <p className="mt-1 text-[10px] text-[#68736c]">
                        {formatMoney(line.product.unitPrice)} · TVA{" "}
                        {line.product.taxRate}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.product.id, 0)}
                      className="text-red-600"
                      aria-label={`Retirer ${line.product.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-xl border border-[#dbe6df] bg-white">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.product.id, line.quantity - 1)
                        }
                        className="grid size-9 place-items-center"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-xs font-black">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(line.product.id, line.quantity + 1)
                        }
                        disabled={
                          line.product.trackInventory &&
                          line.quantity >= line.product.availableStock
                        }
                        className="grid size-9 place-items-center disabled:opacity-40"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-black">
                      {formatMoney(line.product.unitPrice * line.quantity)}
                    </p>
                  </div>
                </article>
              ))}
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-black text-red-600"
              >
                Vider le panier
              </button>
            </div>
          )}

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#68736c]">Sous-total</span>
              <span className="font-black">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#68736c]">TVA estimée</span>
              <span className="font-black">{formatMoney(taxTotal)}</span>
            </div>
            <div className="border-t border-[#dbe6df] pt-4">
              <div className="flex justify-between text-lg">
                <span className="font-black">Total</span>
                <span className="font-black text-[#0b7a4b]">
                  {formatMoney(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-[#dbe6df] bg-[#f8fbf9] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.16em] text-[#0b7a4b] uppercase">
                  Client CRM
                </p>
                <p className="mt-1 text-xs text-[#68736c]">
                  Rattachez la vente à un client pour historiser ses achats.
                </p>
              </div>
              <UserRound className="size-5 text-[#0b7a4b]" />
            </div>

            {selectedCustomer ? (
              <div className="mt-4 rounded-2xl border border-[#dbe6df] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">
                      {selectedCustomer.name}
                    </p>
                    <p className="mt-1 text-[10px] text-[#68736c]">
                      {selectedCustomer.phone ??
                        selectedCustomer.email ??
                        "Contact non renseigné"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId("")}
                    className="text-[10px] font-black text-red-600"
                  >
                    Retirer
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="rounded-xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {selectedCustomer.saleCount}
                    </p>
                    <p className="text-[#68736c]">ventes</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {formatMoney(selectedCustomer.totalSpent)}
                    </p>
                    <p className="text-[#68736c]">dépensé</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fbf9] p-2">
                    <p className="font-black text-[#0b7a4b]">
                      {selectedCustomer.loyaltyPoints}
                    </p>
                    <p className="text-[#68736c]">points</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label className="relative mt-4 block">
                  <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#68736c]" />
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#dbe6df] bg-white pr-4 pl-11 text-sm font-bold transition outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                    placeholder="Rechercher client, téléphone..."
                  />
                </label>
                {filteredCustomers.length > 0 ? (
                  <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="w-full rounded-2xl border border-[#dbe6df] bg-white p-3 text-left transition hover:border-[#0b7a4b]"
                      >
                        <p className="text-xs font-black">{customer.name}</p>
                        <p className="mt-1 text-[10px] text-[#68736c]">
                          {customer.phone ??
                            customer.email ??
                            "Contact non renseigné"}{" "}
                          · {customer.saleCount} vente
                          {customer.saleCount > 1 ? "s" : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_0.8fr]">
                  <input
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                    className="h-11 rounded-2xl border border-[#dbe6df] bg-white px-4 text-xs font-bold outline-none focus:border-[#0b7a4b]"
                    placeholder="Nom du nouveau client"
                  />
                  <input
                    value={newCustomerPhone}
                    onChange={(event) =>
                      setNewCustomerPhone(event.target.value)
                    }
                    className="h-11 rounded-2xl border border-[#dbe6df] bg-white px-4 text-xs font-bold outline-none focus:border-[#0b7a4b]"
                    placeholder="Téléphone"
                  />
                </div>
                <button
                  type="button"
                  onClick={createCustomer}
                  disabled={
                    isCreatingCustomer ||
                    (!newCustomerName.trim() && !newCustomerPhone.trim())
                  }
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#0b7a4b] bg-white text-xs font-black text-[#0b7a4b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingCustomer ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Créer et sélectionner
                </button>
                {customerError ? (
                  <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                    {customerError}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {availablePaymentMethods.length > 0 ? (
              availablePaymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedPaymentCode(method.code);
                    setPaymentReference("");
                    setCheckoutError(null);
                  }}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-black",
                    selectedPaymentCode === method.code
                      ? "border-[#0b7a4b] bg-[#e9f5ee] text-[#0b7a4b]"
                      : "border-[#dbe6df] text-[#68736c]",
                  )}
                >
                  {method.provider === "cash" ? (
                    <Banknote className="size-4" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  {method.name}
                </button>
              ))
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentCode("cash")}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-black",
                    selectedPaymentCode === "cash"
                      ? "border-[#0b7a4b] bg-[#e9f5ee] text-[#0b7a4b]"
                      : "border-[#dbe6df] text-[#68736c]",
                  )}
                >
                  <Banknote className="size-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentCode("mobile_money")}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-black",
                    selectedPaymentCode === "mobile_money"
                      ? "border-[#0b7a4b] bg-[#e9f5ee] text-[#0b7a4b]"
                      : "border-[#dbe6df] text-[#68736c]",
                  )}
                >
                  <CreditCard className="size-4" />
                  Mobile Money
                </button>
              </>
            )}
          </div>

          {selectedPaymentMethod?.requiresReference ? (
            <label className="mt-4 block">
              <span className="text-xs font-black text-[#68736c]">
                Référence paiement obligatoire
              </span>
              <input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] px-4 text-sm font-bold transition outline-none focus:border-[#0b7a4b] focus:bg-white focus:ring-4 focus:ring-[#0b7a4b]/10"
                placeholder="Ex : transaction Wave / Orange Money"
              />
            </label>
          ) : null}

          {checkoutError ? (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {checkoutError}
            </div>
          ) : null}

          {checkoutSuccess ? (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
              {checkoutSuccess}
            </div>
          ) : null}

          <button
            type="button"
            onClick={checkout}
            disabled={
              cart.length === 0 ||
              isSubmitting ||
              !selectedCashSession ||
              (selectedPaymentMethod?.requiresReference &&
                paymentReference.trim().length === 0)
            }
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Encaissement…
              </>
            ) : (
              <>
                Encaisser maintenant
                <ArrowRight className="size-4" />
              </>
            )}
          </button>

          <div className="mt-6 border-t border-[#dbe6df] pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-[#0b7a4b] uppercase">
                  Dashboard caisse
                </p>
                <h2 className="mt-1 text-lg font-black">Performance POS</h2>
              </div>
              <span className="rounded-full bg-[#e9f5ee] px-3 py-1 text-xs font-black text-[#0b7a4b]">
                {filteredRecentSales.length}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[#68736c] uppercase">
                  <WalletCards className="size-3.5 text-[#0b7a4b]" />
                  Aujourd’hui
                </div>
                <p className="mt-2 text-lg font-black text-[#0b7a4b]">
                  {formatMoney(todayTotal)}
                </p>
                <p className="mt-1 text-[10px] text-[#68736c]">
                  {todaySales.length} vente{todaySales.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[#68736c] uppercase">
                  <TrendingUp className="size-3.5 text-[#0b7a4b]" />
                  Panier moyen
                </div>
                <p className="mt-2 text-lg font-black text-[#0b7a4b]">
                  {formatMoney(todayAverageBasket)}
                </p>
                <p className="mt-1 text-[10px] text-[#68736c]">
                  Calculé sur la journée
                </p>
              </div>
              <div className="rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[#68736c] uppercase">
                  <BarChart3 className="size-3.5 text-[#0b7a4b]" />
                  Période filtrée
                </div>
                <p className="mt-2 text-lg font-black text-[#0b7a4b]">
                  {formatMoney(filteredTotal)}
                </p>
                <p className="mt-1 text-[10px] text-[#68736c]">
                  {filteredRecentSales.length} résultat
                  {filteredRecentSales.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[#68736c] uppercase">
                  <PackageSearch className="size-3.5 text-[#0b7a4b]" />
                  Top produit
                </div>
                <p className="mt-2 truncate text-sm font-black text-[#0b7a4b]">
                  {bestProduct?.name ?? "Aucun"}
                </p>
                <p className="mt-1 text-[10px] text-[#68736c]">
                  {bestProduct
                    ? `${bestProduct.quantity} vendu${bestProduct.quantity > 1 ? "s" : ""}`
                    : "En attente de ventes"}
                </p>
              </div>
            </div>

            {paymentBreakdown.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4">
                <p className="text-[10px] font-black tracking-[0.14em] text-[#68736c] uppercase">
                  Paiements filtrés
                </p>
                <div className="mt-3 space-y-2">
                  {paymentBreakdown.map((payment) => (
                    <div
                      key={payment.name}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-bold text-[#68736c]">
                        {payment.name}
                      </span>
                      <span className="font-black">
                        {formatMoney(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-black text-[#68736c] uppercase">
                    <CalendarDays className="size-3" />
                    Date
                  </span>
                  <select
                    value={saleDateFilter}
                    onChange={(event) =>
                      setSaleDateFilter(event.target.value as SaleDateFilter)
                    }
                    className="h-11 w-full rounded-2xl border border-[#dbe6df] bg-white px-3 text-xs font-black outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                  >
                    <option value="today">Aujourd’hui</option>
                    <option value="7d">7 jours</option>
                    <option value="all">Tout</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-black text-[#68736c] uppercase">
                    <Store className="size-3" />
                    Boutique
                  </span>
                  <select
                    value={saleStoreFilter}
                    onChange={(event) => setSaleStoreFilter(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#dbe6df] bg-white px-3 text-xs font-black outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                  >
                    <option value="all">Toutes</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-black text-[#68736c] uppercase">
                    <Filter className="size-3" />
                    Paiement
                  </span>
                  <select
                    value={salePaymentFilter}
                    onChange={(event) =>
                      setSalePaymentFilter(event.target.value)
                    }
                    className="h-11 w-full rounded-2xl border border-[#dbe6df] bg-white px-3 text-xs font-black outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                  >
                    <option value="all">Tous</option>
                    {salePaymentOptions.map((paymentName) => (
                      <option key={paymentName} value={paymentName}>
                        {paymentName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-[#0b7a4b] uppercase">
                  Historique
                </p>
                <h2 className="mt-1 text-lg font-black">Ventes récentes</h2>
              </div>
            </div>

            <label className="relative mt-4 block">
              <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#68736c]" />
              <input
                value={saleSearch}
                onChange={(event) => setSaleSearch(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] pr-4 pl-11 text-sm font-bold transition outline-none focus:border-[#0b7a4b] focus:bg-white focus:ring-4 focus:ring-[#0b7a4b]/10"
                placeholder="Rechercher un reçu…"
              />
            </label>

            {filteredRecentSales.length > 0 ? (
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
                {filteredRecentSales.map((sale) => (
                  <article
                    key={sale.id}
                    className="rounded-2xl border border-[#dbe6df] bg-[#f8fbf9] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black">
                          {sale.receiptNumber}
                        </h3>
                        <p className="mt-1 text-[10px] text-[#68736c]">
                          {sale.storeName} · {formatDateTime(sale.createdAt)}
                        </p>
                        {sale.customerName ? (
                          <p className="mt-1 text-[10px] font-bold text-[#0b7a4b]">
                            Client : {sale.customerName}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-black text-[#0b7a4b]">
                        {formatMoney(sale.total)}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold text-[#68736c]">
                        {sale.paymentMethodName} · {sale.lines.length} ligne
                        {sale.lines.length > 1 ? "s" : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => openRecentSaleReceipt(sale)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-[10px] font-black text-[#0b7a4b]"
                      >
                        <ReceiptText className="size-3.5" />
                        Reçu
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#c9d8cf] bg-[#f8fbf9] px-5 py-8 text-center">
                <ReceiptText className="mx-auto size-8 text-[#0b7a4b]" />
                <p className="mt-3 text-sm font-black">Aucune vente récente</p>
                <p className="mt-1 text-xs leading-5 text-[#68736c]">
                  Les ventes encaissées apparaîtront ici pour réimpression.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {receipt ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#14251d]/60 px-4 py-6 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#dbe6df] px-5 py-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-[#0b7a4b] uppercase">
                  Reçu de caisse
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em]">
                  Vente encaissée
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="grid size-10 place-items-center rounded-2xl border border-[#dbe6df] text-[#68736c]"
                aria-label="Fermer le reçu"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-5">
              <div className="rounded-[1.5rem] border border-[#dbe6df] bg-[#f8fbf9] p-5">
                <div className="text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-black">
                    {receipt.businessName}
                  </h3>
                  <p className="text-xs font-bold text-[#68736c]">
                    {receipt.storeName}
                  </p>
                  <p className="mt-1 text-xs text-[#68736c]">
                    {formatDateTime(receipt.issuedAt)}
                  </p>
                </div>

                <div className="my-5 border-t border-dashed border-[#b8cdc0]" />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#68736c]">Numéro reçu</span>
                    <span className="font-black">{receipt.receiptNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#68736c]">Paiement</span>
                    <span className="font-black">
                      {receipt.paymentMethodName}
                    </span>
                  </div>
                  {receipt.customerName ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#68736c]">Client</span>
                      <span className="font-black">{receipt.customerName}</span>
                    </div>
                  ) : null}
                  {receipt.paymentReference ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#68736c]">Référence</span>
                      <span className="font-black">
                        {receipt.paymentReference}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="my-5 border-t border-dashed border-[#b8cdc0]" />

                <div className="space-y-3">
                  {receipt.lines.map((line) => (
                    <article
                      key={line.id}
                      className="rounded-2xl border border-[#dbe6df] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black">{line.name}</h4>
                          <p className="mt-1 text-[10px] text-[#68736c]">
                            {line.sku ?? "Sans référence"} · TVA {line.taxRate}%
                          </p>
                        </div>
                        <p className="text-sm font-black">
                          {formatMoney(line.lineTotal)}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-[#68736c]">
                        <span>
                          {line.quantity} × {formatMoney(line.unitPrice)}
                        </span>
                        <span>TVA {formatMoney(line.taxAmount)}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="my-5 border-t border-dashed border-[#b8cdc0]" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#68736c]">Sous-total</span>
                    <span className="font-black">
                      {formatMoney(receipt.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#68736c]">TVA</span>
                    <span className="font-black">
                      {formatMoney(receipt.taxTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#dbe6df] pt-3 text-lg">
                    <span className="font-black">Total payé</span>
                    <span className="font-black text-[#0b7a4b]">
                      {formatMoney(receipt.total)}
                    </span>
                  </div>
                </div>

                <p className="mt-6 text-center text-xs leading-5 text-[#68736c]">
                  Merci pour votre confiance.
                  <br />
                  Reçu généré par AFRICRM Shop.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => printReceipt(receipt)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] text-sm font-black text-white"
                >
                  <Printer className="size-4" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="flex h-12 items-center justify-center rounded-2xl border border-[#dbe6df] text-sm font-black text-[#14251d]"
                >
                  Nouvelle vente
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
