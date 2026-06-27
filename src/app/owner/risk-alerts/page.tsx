import { redirect } from "next/navigation";
import {
  OwnerRiskAlertsClient,
  type OwnerRiskAlert,
  type OwnerRiskBusiness,
  type OwnerRiskStore,
} from "@/components/owner/owner-risk-alerts-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { buildOwnerRiskAlerts } from "@/lib/owner-risk-alerts";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type SaleMetadata = {
  pos18?: {
    reason?: string;
  };
};

type SaleRow = {
  id: string;
  business_id: string;
  store_id: string;
  receipt_number: string | null;
  status: string;
  total_amount: number | string;
  paid_amount: number | string | null;
  created_at: string;
  metadata: SaleMetadata | null;
};

type PaymentRow = {
  sale_id: string;
  amount: number | string;
  status: string;
};

type CashSessionRow = {
  id: string;
  business_id: string;
  store_id: string;
  expected_closing_balance: number | string | null;
  closing_balance: number | string | null;
  difference_amount: number | string | null;
  closed_at: string | null;
};

type StockMovementRow = {
  id: string;
  business_id: string;
  store_id: string;
  product_id: string;
  movement_type: string;
  quantity_delta: number | string;
  reason: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export default async function OwnerRiskAlertsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const ownerBusinesses = await getOwnerBusinesses(owner);
  const businessIds = ownerBusinesses.map((business) => business.id);
  const businesses: OwnerRiskBusiness[] = ownerBusinesses.map((business) => ({
    id: business.id,
    name: business.name,
  }));

  const [storesResult, salesResult, cashSessionsResult, stockMovementsResult] =
    businessIds.length
      ? await Promise.all([
          supabaseAdmin
            .from("stores")
            .select("id, business_id, name")
            .in("business_id", businessIds)
            .is("deleted_at", null)
            .order("created_at"),
          supabaseAdmin
            .from("sales")
            .select(
              "id, business_id, store_id, receipt_number, status, total_amount, paid_amount, created_at, metadata",
            )
            .in("business_id", businessIds)
            .in("status", ["completed", "cancelled", "refunded"])
            .order("created_at", { ascending: false })
            .limit(800),
          supabaseAdmin
            .from("cash_sessions")
            .select(
              "id, business_id, store_id, expected_closing_balance, closing_balance, difference_amount, closed_at",
            )
            .in("business_id", businessIds)
            .eq("status", "closed")
            .not("closed_at", "is", null)
            .order("closed_at", { ascending: false })
            .limit(240),
          supabaseAdmin
            .from("stock_movements")
            .select(
              "id, business_id, store_id, product_id, movement_type, quantity_delta, reason, created_at",
            )
            .in("business_id", businessIds)
            .eq("movement_type", "adjustment")
            .order("created_at", { ascending: false })
            .limit(500),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (
    storesResult.error ||
    salesResult.error ||
    cashSessionsResult.error ||
    stockMovementsResult.error
  ) {
    throw new Error(
      storesResult.error?.message ??
        salesResult.error?.message ??
        cashSessionsResult.error?.message ??
        stockMovementsResult.error?.message,
    );
  }

  const stores: OwnerRiskStore[] = (
    (storesResult.data ?? []) as StoreRow[]
  ).map((store) => ({
    id: store.id,
    businessId: store.business_id,
    name: store.name,
  }));
  const saleRows = (salesResult.data ?? []) as SaleRow[];
  const saleIds = saleRows.map((sale) => sale.id);
  const stockMovementRows = (stockMovementsResult.data ??
    []) as StockMovementRow[];
  const productIds = [
    ...new Set(stockMovementRows.map((movement) => movement.product_id)),
  ];

  const [paymentsResult, productsResult] = await Promise.all([
    saleIds.length
      ? supabaseAdmin
          .from("payments")
          .select("sale_id, amount, status")
          .in("sale_id", saleIds)
      : { data: [], error: null },
    productIds.length
      ? supabaseAdmin.from("products").select("id, name").in("id", productIds)
      : { data: [], error: null },
  ]);

  if (paymentsResult.error || productsResult.error) {
    throw new Error(
      paymentsResult.error?.message ?? productsResult.error?.message,
    );
  }

  const businessNames = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const storeNames = new Map(stores.map((store) => [store.id, store.name]));
  const productNames = new Map(
    ((productsResult.data ?? []) as ProductRow[]).map((product) => [
      product.id,
      product.name,
    ]),
  );
  const alerts = buildOwnerRiskAlerts({
    sales: saleRows.map((sale) => ({
      id: sale.id,
      businessId: sale.business_id,
      storeId: sale.store_id,
      receiptNumber: sale.receipt_number ?? "Ticket POS",
      status: sale.status,
      totalAmount: toNumber(sale.total_amount),
      paidAmount: toNumber(sale.paid_amount),
      createdAt: sale.created_at,
      afterSaleReason: sale.metadata?.pos18?.reason ?? null,
    })),
    payments: ((paymentsResult.data ?? []) as PaymentRow[]).map((payment) => ({
      saleId: payment.sale_id,
      amount: toNumber(payment.amount),
      status: payment.status,
    })),
    cashSessions: ((cashSessionsResult.data ?? []) as CashSessionRow[]).flatMap(
      (session) =>
        session.closed_at
          ? [
              {
                id: session.id,
                businessId: session.business_id,
                storeId: session.store_id,
                expectedClosingBalance: toNumber(
                  session.expected_closing_balance,
                ),
                closingBalance: toNumber(session.closing_balance),
                differenceAmount: toNumber(session.difference_amount),
                closedAt: session.closed_at,
              },
            ]
          : [],
    ),
    stockMovements: stockMovementRows.map((movement) => ({
      id: movement.id,
      businessId: movement.business_id,
      storeId: movement.store_id,
      productId: movement.product_id,
      productName: productNames.get(movement.product_id) ?? "Produit",
      movementType: movement.movement_type,
      quantityDelta: toNumber(movement.quantity_delta),
      reason: movement.reason,
      createdAt: movement.created_at,
    })),
  });
  const enrichedAlerts: OwnerRiskAlert[] = alerts.map((alert) => ({
    ...alert,
    businessName: businessNames.get(alert.businessId) ?? "Entreprise",
    storeName: storeNames.get(alert.storeId) ?? "Boutique",
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 26
        </p>
        <h1 className="mt-3 text-3xl font-black">Contrôle & anti-fraude</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Détectez les écarts de caisse, paiements incomplets, remboursements
          sensibles et ajustements de stock à vérifier.
        </p>
      </div>

      <OwnerRiskAlertsClient
        businesses={businesses}
        stores={stores}
        alerts={enrichedAlerts}
      />
    </div>
  );
}
