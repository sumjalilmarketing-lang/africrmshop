import {
  AlertTriangle,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  PackageSearch,
  ReceiptText,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import {
  buildOwnerDashboardSummary,
  type DashboardNotificationInput,
} from "@/lib/owner-dashboard-summary";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { getOwnerNotificationsData } from "@/lib/owner-notifications-data";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SaleRow = {
  id: string;
  status: string;
  total_amount: number | string;
};

type PaymentRow = {
  sale_id: string;
  provider: string;
  amount: number | string;
  status: string;
};

type ExpenseRow = {
  status: string;
  total_amount: number | string;
};

type ProductRow = {
  id: string;
  low_stock_threshold: number | string | null;
};

type StockRow = {
  product_id: string;
  quantity: number | string;
  reserved_quantity: number | string;
};

const moneyFormatter = new Intl.NumberFormat("fr-SN", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function getDateRangeForToday() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(`${today}T00:00:00.000Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  return {
    start: `${today}T00:00:00.000Z`,
    end: tomorrow.toISOString(),
  };
}

export default async function OwnerDashboardPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const businesses = await getOwnerBusinesses(owner);
  const businessIds = businesses.map((business) => business.id);
  const { start, end } = getDateRangeForToday();
  const [
    notificationsData,
    salesResult,
    expensesResult,
    productsResult,
    stocksResult,
  ] = businessIds.length
    ? await Promise.all([
        getOwnerNotificationsData(owner),
        supabaseAdmin
          .from("sales")
          .select("id, status, total_amount")
          .in("business_id", businessIds)
          .gte("created_at", start)
          .lt("created_at", end)
          .limit(600),
        supabaseAdmin
          .from("expenses")
          .select("status, total_amount")
          .in("business_id", businessIds)
          .in("status", ["pending", "rejected"])
          .limit(500),
        supabaseAdmin
          .from("products")
          .select("id, low_stock_threshold")
          .in("business_id", businessIds)
          .eq("is_active", true)
          .is("deleted_at", null)
          .limit(1000),
        supabaseAdmin
          .from("product_stock")
          .select("product_id, quantity, reserved_quantity")
          .in("business_id", businessIds)
          .limit(2000),
      ])
    : [
        { businesses: [], stores: [], notifications: [] },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (
    salesResult.error ||
    expensesResult.error ||
    productsResult.error ||
    stocksResult.error
  ) {
    throw new Error(
      salesResult.error?.message ??
        expensesResult.error?.message ??
        productsResult.error?.message ??
        stocksResult.error?.message,
    );
  }

  const sales = (salesResult.data ?? []) as SaleRow[];
  const saleIds = sales.map((sale) => sale.id);
  const paymentsResult = saleIds.length
    ? await supabaseAdmin
        .from("payments")
        .select("sale_id, provider, amount, status")
        .in("sale_id", saleIds)
    : { data: [], error: null };

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  const summary = buildOwnerDashboardSummary({
    businesses: businesses.map((business) => ({
      id: business.id,
      storeCount: business.storeCount,
      employeeCount: business.employeeCount,
    })),
    sales: sales.map((sale) => ({
      id: sale.id,
      status: sale.status,
      totalAmount: toNumber(sale.total_amount),
    })),
    payments: ((paymentsResult.data ?? []) as PaymentRow[]).map((payment) => ({
      saleId: payment.sale_id,
      provider: payment.provider,
      amount: toNumber(payment.amount),
      status: payment.status,
    })),
    expenses: ((expensesResult.data ?? []) as ExpenseRow[]).map((expense) => ({
      status: expense.status,
      totalAmount: toNumber(expense.total_amount),
    })),
    products: ((productsResult.data ?? []) as ProductRow[]).map((product) => ({
      id: product.id,
      lowStockThreshold: toNumber(product.low_stock_threshold),
    })),
    stocks: ((stocksResult.data ?? []) as StockRow[]).map((stock) => ({
      productId: stock.product_id,
      quantity: toNumber(stock.quantity),
      reservedQuantity: toNumber(stock.reserved_quantity),
    })),
    notifications:
      notificationsData.notifications as DashboardNotificationInput[],
  });
  const quickActions = [
    ["Ouvrir la caisse", "/pos"],
    ["Voir les ventes", "/owner/sales"],
    ["Contrôler les alertes", "/owner/risk-alerts"],
    ["Synchroniser notifications", "/owner/notifications"],
  ];
  const metrics = [
    {
      label: "CA du jour",
      value: formatMoney(summary.todaySalesTotal),
      detail: `${summary.todaySalesCount} ticket(s) encaissé(s)`,
      icon: ReceiptText,
      href: "/owner/sales",
    },
    {
      label: "Cash du jour",
      value: formatMoney(summary.cashTodayTotal),
      detail: `Mobile Money ${formatMoney(summary.mobileMoneyTodayTotal)}`,
      icon: Banknote,
      href: "/owner/cash-reports",
    },
    {
      label: "Notifications",
      value: String(summary.unreadNotificationsCount),
      detail: `${summary.highPriorityNotificationsCount} priorité haute`,
      icon: Bell,
      href: "/owner/notifications",
    },
    {
      label: "Stock critique",
      value: String(summary.lowStockCount),
      detail: "produit(s) sous seuil",
      icon: PackageSearch,
      href: "/owner/inventory",
    },
    {
      label: "Dépenses à valider",
      value: String(summary.pendingExpensesCount),
      detail: formatMoney(summary.pendingExpensesTotal),
      icon: CreditCard,
      href: "/owner/expenses",
    },
    {
      label: "Dépenses rejetées",
      value: String(summary.rejectedExpensesCount),
      detail: "à corriger avant clôture",
      icon: AlertTriangle,
      href: "/owner/expenses",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="rounded-[2rem] bg-[#0a3827] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-[#79d4a2] uppercase">
              POS 30 · Cockpit propriétaire
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Bonjour, {owner.displayName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Pilotez vos entreprises, vos boutiques, la caisse, les dépenses et
              les alertes depuis une seule vue.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px]">
            {quickActions.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-center text-xs font-black text-white transition hover:bg-white/14"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          [Building2, "Entreprises", summary.businessCount],
          [Store, "Boutiques", summary.storeCount],
          [Users, "Employés actifs", summary.employeeCount],
        ].map(([Icon, label, value]) => {
          const MetricIcon = Icon as typeof Building2;

          return (
            <article
              key={label as string}
              className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
                <MetricIcon className="size-5" />
              </span>
              <p className="mt-5 text-3xl font-black">{value as number}</p>
              <p className="text-muted mt-1 text-xs font-bold">
                {label as string}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="rounded-3xl border border-[#e1e7e3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0b7a4b]/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted text-xs font-bold">{metric.label}</p>
                  <p className="mt-3 text-2xl font-black">{metric.value}</p>
                  <p className="text-muted mt-1 text-xs">{metric.detail}</p>
                </div>
                <span className="grid size-11 place-items-center rounded-2xl bg-[#f3f7f4] text-[#0b7a4b]">
                  <Icon className="size-5" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {businesses.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#bdd6c6] bg-white p-8 text-center sm:p-12">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
            <Store className="size-6" />
          </span>
          <h2 className="mt-5 text-2xl font-bold">
            Créez votre première entreprise
          </h2>
          <p className="text-muted mx-auto mt-3 max-w-lg text-sm leading-6">
            Choisissez votre activité, configurez votre première boutique et
            commencez à vendre ou à gérer vos rendez-vous.
          </p>
          <Link
            href="/owner/businesses/new"
            className="mt-6 inline-flex rounded-xl bg-[#0b7a4b] px-5 py-3 text-sm font-bold text-white"
          >
            Commencer l’onboarding
          </Link>
        </section>
      ) : (
        <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Mes entreprises</h2>
              <p className="text-muted mt-1 text-xs">
                Accès rapide aux activités supervisées
              </p>
            </div>
            <Link
              href="/owner/businesses"
              className="text-xs font-bold text-[#0b7a4b]"
            >
              Voir tout
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((business) => (
              <article
                key={business.id}
                className="rounded-2xl border border-[#e5e9e6] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                    {business.status}
                  </span>
                  <CalendarDays className="text-muted size-4" />
                </div>
                <h3 className="mt-4 text-base font-bold">{business.name}</h3>
                <p className="text-muted mt-1 text-xs">
                  {business.activity?.name ?? "Activité à configurer"}
                </p>
                <div className="text-muted mt-5 flex gap-4 text-[10px]">
                  <span>{business.storeCount} boutique(s)</span>
                  <span>{business.employeeCount} employé(s)</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
