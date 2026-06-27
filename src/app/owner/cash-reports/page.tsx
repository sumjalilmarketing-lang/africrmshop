import { redirect } from "next/navigation";
import {
  OwnerCashReportsClient,
  type OwnerCashReportBusiness,
  type OwnerCashReportItem,
  type OwnerCashReportStore,
} from "@/components/owner/owner-cash-reports-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import {
  buildCashSessionReports,
  type CashReportMovementInput,
  type CashReportPaymentInput,
  type CashReportSaleInput,
  type CashReportSessionInput,
} from "@/lib/pos-cash-reports";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type CashSessionRow = {
  id: string;
  business_id: string;
  store_id: string;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number | string;
  expected_closing_balance: number | string | null;
  closing_balance: number | string | null;
  difference_amount: number | string | null;
  notes: string | null;
};

type UserRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type SaleRow = {
  id: string;
  store_id: string;
  total_amount: number | string;
  created_at: string;
};

type PaymentRow = {
  sale_id: string;
  provider: string;
  amount: number | string;
};

type CashMovementRow = {
  id: string;
  cash_session_id: string;
  movement_type: string;
  amount: number | string;
  reason: string;
  created_at: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function getUserName(user: UserRow | undefined) {
  if (!user) return null;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return user.display_name || fullName || user.email;
}

export default async function OwnerCashReportsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerCashReportBusiness[] = ownerBusinesses.map(
    (business) => ({
      id: business.id,
      name: business.name,
    }),
  );

  const [storesResult, sessionsResult] = businessIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("stores")
          .select("id, business_id, name")
          .in("business_id", businessIds)
          .is("deleted_at", null)
          .order("created_at"),
        supabaseAdmin
          .from("cash_sessions")
          .select(
            "id, business_id, store_id, opened_by, closed_by, opened_at, closed_at, opening_balance, expected_closing_balance, closing_balance, difference_amount, notes",
          )
          .in("business_id", businessIds)
          .eq("status", "closed")
          .not("closed_at", "is", null)
          .order("closed_at", { ascending: false })
          .limit(80),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (storesResult.error || sessionsResult.error) {
    throw new Error(
      storesResult.error?.message ?? sessionsResult.error?.message,
    );
  }

  const stores: OwnerCashReportStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const sessionRows = ((sessionsResult.data ?? []) as CashSessionRow[]).filter(
    (session) => session.closed_at,
  );
  const sessionIds = sessionRows.map((session) => session.id);
  const storeIds = [...new Set(sessionRows.map((session) => session.store_id))];
  const userIds = [
    ...new Set(
      sessionRows.flatMap((session) =>
        [session.opened_by, session.closed_by].filter(Boolean),
      ),
    ),
  ] as string[];
  const earliestOpenedAt =
    sessionRows.length > 0
      ? sessionRows
          .map((session) => session.opened_at)
          .sort((first, second) => first.localeCompare(second))[0]
      : null;
  const latestClosedAt =
    sessionRows.length > 0
      ? sessionRows
          .map((session) => session.closed_at as string)
          .sort((first, second) => second.localeCompare(first))[0]
      : null;

  const [usersResult, movementsResult, salesResult] =
    sessionRows.length > 0 && earliestOpenedAt && latestClosedAt
      ? await Promise.all([
          userIds.length > 0
            ? supabaseAdmin
                .from("users")
                .select("id, display_name, first_name, last_name, email")
                .in("id", userIds)
            : { data: [], error: null },
          supabaseAdmin
            .from("cash_movements")
            .select(
              "id, cash_session_id, movement_type, amount, reason, created_at",
            )
            .in("cash_session_id", sessionIds),
          supabaseAdmin
            .from("sales")
            .select("id, store_id, total_amount, created_at")
            .in("store_id", storeIds)
            .eq("status", "completed")
            .gte("created_at", earliestOpenedAt)
            .lte("created_at", latestClosedAt),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (usersResult.error || movementsResult.error || salesResult.error) {
    throw new Error(
      usersResult.error?.message ??
        movementsResult.error?.message ??
        salesResult.error?.message,
    );
  }

  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const saleIds = saleRows.map((sale) => sale.id);
  const paymentsResult = saleIds.length
    ? await supabaseAdmin
        .from("payments")
        .select("sale_id, provider, amount")
        .in("sale_id", saleIds)
    : { data: [], error: null };

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  const usersById = new Map(
    ((usersResult.data ?? []) as UserRow[]).map((user) => [user.id, user]),
  );
  const sessions: CashReportSessionInput[] = sessionRows.map((session) => ({
    id: session.id,
    businessId: session.business_id,
    storeId: session.store_id,
    openedAt: session.opened_at,
    closedAt: session.closed_at as string,
    openingBalance: toNumber(session.opening_balance),
    expectedClosingBalance: toNumber(session.expected_closing_balance),
    closingBalance: toNumber(session.closing_balance),
    differenceAmount: toNumber(session.difference_amount),
    notes: session.notes,
    openedByName: getUserName(
      session.opened_by ? usersById.get(session.opened_by) : undefined,
    ),
    closedByName: getUserName(
      session.closed_by ? usersById.get(session.closed_by) : undefined,
    ),
  }));
  const sales: CashReportSaleInput[] = saleRows.map((sale) => ({
    id: sale.id,
    storeId: sale.store_id,
    createdAt: sale.created_at,
    totalAmount: toNumber(sale.total_amount),
  }));
  const payments: CashReportPaymentInput[] = (
    (paymentsResult.data ?? []) as PaymentRow[]
  ).map((payment) => ({
    saleId: payment.sale_id,
    provider: payment.provider,
    amount: toNumber(payment.amount),
  }));
  const movements: CashReportMovementInput[] = (
    (movementsResult.data ?? []) as CashMovementRow[]
  ).map((movement) => ({
    id: movement.id,
    cashSessionId: movement.cash_session_id,
    movementType: movement.movement_type,
    amount: toNumber(movement.amount),
    reason: movement.reason,
    createdAt: movement.created_at,
  }));
  const reports: OwnerCashReportItem[] = buildCashSessionReports({
    sessions,
    sales,
    payments,
    movements,
  }).map((report) => ({
    ...report,
    businessName: businessNames.get(report.businessId) ?? "Entreprise",
    storeName: storeNames.get(report.storeId) ?? "Boutique",
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 17
        </p>
        <h1 className="mt-3 text-3xl font-black">Rapports Z de caisse</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Consultez, contrôlez et imprimez les rapports de clôture des sessions
          de caisse.
        </p>
      </div>

      <OwnerCashReportsClient
        businesses={businesses}
        stores={stores}
        reports={reports}
      />
    </div>
  );
}
