import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const amountSchema = z.number().min(0).max(999_999_999);

const openCashSessionSchema = z.object({
  action: z.literal("open"),
  storeId: postgresUuidSchema,
  openingBalance: amountSchema,
  notes: z.string().trim().max(500).optional(),
});

const closeCashSessionSchema = z.object({
  action: z.literal("close"),
  cashSessionId: postgresUuidSchema,
  closingBalance: amountSchema,
  notes: z.string().trim().max(500).optional(),
});

const cashSessionActionSchema = z.discriminatedUnion("action", [
  openCashSessionSchema,
  closeCashSessionSchema,
]);

type StoreRow = {
  id: string;
  business_id: string;
};

type CashSessionRow = {
  id: string;
  business_id: string;
  store_id: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number | string;
  expected_closing_balance: number | string | null;
  closing_balance: number | string | null;
  difference_amount: number | string | null;
  notes: string | null;
};

type SaleRow = {
  id: string;
  total_amount: number | string;
};

type PaymentRow = {
  sale_id: string;
  amount: number | string;
};

type CashMovementRow = {
  movement_type: string;
  amount: number | string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serializeCashSession(session: CashSessionRow) {
  return {
    id: session.id,
    businessId: session.business_id,
    storeId: session.store_id,
    status: session.status,
    openedAt: session.opened_at,
    closedAt: session.closed_at,
    openingBalance: toNumber(session.opening_balance),
    expectedClosingBalance:
      session.expected_closing_balance === null
        ? null
        : toNumber(session.expected_closing_balance),
    closingBalance:
      session.closing_balance === null
        ? null
        : toNumber(session.closing_balance),
    differenceAmount:
      session.difference_amount === null
        ? null
        : toNumber(session.difference_amount),
    notes: session.notes,
  };
}

async function getStore(storeId: string) {
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("id, business_id")
    .eq("id", storeId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return data as StoreRow;
}

async function calculateExpectedClosingBalance(session: CashSessionRow) {
  const { data: salesData, error: salesError } = await supabaseAdmin
    .from("sales")
    .select("id, total_amount")
    .eq("business_id", session.business_id)
    .eq("store_id", session.store_id)
    .eq("status", "completed")
    .gte("created_at", session.opened_at);

  if (salesError) {
    throw new Error(salesError.message);
  }

  const sales = (salesData ?? []) as SaleRow[];
  const saleIds = sales.map((sale) => sale.id);
  if (saleIds.length === 0) return toNumber(session.opening_balance);

  const { data: paymentsData, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("sale_id, amount")
    .eq("business_id", session.business_id)
    .eq("provider", "cash")
    .eq("status", "completed")
    .in("sale_id", saleIds);

  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  const cashTotal = ((paymentsData ?? []) as PaymentRow[]).reduce(
    (total, payment) => total + toNumber(payment.amount),
    0,
  );

  const { data: movementsData, error: movementsError } = await supabaseAdmin
    .from("cash_movements")
    .select("movement_type, amount")
    .eq("business_id", session.business_id)
    .eq("cash_session_id", session.id);

  if (movementsError) {
    throw new Error(movementsError.message);
  }

  const manualMovementTotal = (
    (movementsData ?? []) as CashMovementRow[]
  ).reduce((total, movement) => {
    const amount = toNumber(movement.amount);
    if (["cash_in", "deposit"].includes(movement.movement_type)) {
      return total + amount;
    }
    if (["cash_out", "withdrawal"].includes(movement.movement_type)) {
      return total - amount;
    }

    return total;
  }, 0);

  return toNumber(session.opening_balance) + cashTotal + manualMovementTotal;
}

async function openCashSession(
  session: NonNullable<Awaited<ReturnType<typeof getAppSession>>>,
  input: z.infer<typeof openCashSessionSchema>,
) {
  const store = await getStore(input.storeId);
  if (!store) {
    return jsonError("Point de vente introuvable ou inactif.", 404);
  }

  if (
    !hasPermission(session, "pos.access", {
      businessId: store.business_id,
      storeId: store.id,
    })
  ) {
    return jsonError("Vous n'avez pas accès à cette caisse.", 403);
  }

  const { data: existingSession, error: existingSessionError } =
    await supabaseAdmin
      .from("cash_sessions")
      .select("id")
      .eq("store_id", store.id)
      .eq("status", "open")
      .maybeSingle();

  if (existingSessionError) {
    return jsonError("Impossible de vérifier la session de caisse.", 500);
  }

  if (existingSession) {
    return jsonError("Une session de caisse est déjà ouverte.", 409);
  }

  const { data: cashSession, error } = await supabaseAdmin
    .from("cash_sessions")
    .insert({
      business_id: store.business_id,
      store_id: store.id,
      opened_by: session.profileId,
      status: "open",
      opened_at: new Date().toISOString(),
      opening_balance: input.openingBalance,
      expected_closing_balance: input.openingBalance,
      notes: input.notes ?? null,
      metadata: {
        source: "africrm_pos_v14",
        opened_by: session.profileId,
      },
    })
    .select(
      "id, business_id, store_id, status, opened_at, closed_at, opening_balance, expected_closing_balance, closing_balance, difference_amount, notes",
    )
    .single();

  if (error || !cashSession) {
    return jsonError("La session de caisse n'a pas pu être ouverte.", 500);
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: store.business_id,
    user_id: session.profileId,
    action: "cash_session.opened",
    table_name: "cash_sessions",
    record_id: cashSession.id,
    new_values: {
      store_id: store.id,
      opening_balance: input.openingBalance,
    },
  });

  return NextResponse.json(
    { cashSession: serializeCashSession(cashSession as CashSessionRow) },
    { status: 201 },
  );
}

async function closeCashSession(
  session: NonNullable<Awaited<ReturnType<typeof getAppSession>>>,
  input: z.infer<typeof closeCashSessionSchema>,
) {
  const { data: cashSessionData, error: cashSessionError } = await supabaseAdmin
    .from("cash_sessions")
    .select(
      "id, business_id, store_id, status, opened_at, closed_at, opening_balance, expected_closing_balance, closing_balance, difference_amount, notes",
    )
    .eq("id", input.cashSessionId)
    .eq("status", "open")
    .maybeSingle();

  if (cashSessionError) {
    return jsonError("Impossible de vérifier la session de caisse.", 500);
  }

  if (!cashSessionData) {
    return jsonError("Aucune session de caisse ouverte trouvée.", 404);
  }

  const cashSession = cashSessionData as CashSessionRow;
  if (
    !hasPermission(session, "pos.access", {
      businessId: cashSession.business_id,
      storeId: cashSession.store_id,
    })
  ) {
    return jsonError("Vous n'avez pas accès à cette caisse.", 403);
  }

  let expectedClosingBalance: number;
  try {
    expectedClosingBalance = await calculateExpectedClosingBalance(cashSession);
  } catch (error) {
    console.error("POS: calcul de clôture de caisse impossible", error);
    return jsonError("Le montant attendu n'a pas pu être calculé.", 500);
  }

  const { data: closedSession, error } = await supabaseAdmin
    .from("cash_sessions")
    .update({
      status: "closed",
      closed_by: session.profileId,
      closed_at: new Date().toISOString(),
      expected_closing_balance: expectedClosingBalance,
      closing_balance: input.closingBalance,
      notes: input.notes ?? cashSession.notes,
      metadata: {
        source: "africrm_pos_v14",
        closed_by: session.profileId,
        expected_closing_balance: expectedClosingBalance,
        closing_balance: input.closingBalance,
      },
    })
    .eq("id", cashSession.id)
    .eq("status", "open")
    .select(
      "id, business_id, store_id, status, opened_at, closed_at, opening_balance, expected_closing_balance, closing_balance, difference_amount, notes",
    )
    .single();

  if (error || !closedSession) {
    return jsonError("La session de caisse n'a pas pu être fermée.", 500);
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: cashSession.business_id,
    user_id: session.profileId,
    action: "cash_session.closed",
    table_name: "cash_sessions",
    record_id: cashSession.id,
    new_values: {
      store_id: cashSession.store_id,
      expected_closing_balance: expectedClosingBalance,
      closing_balance: input.closingBalance,
    },
  });

  return NextResponse.json({
    cashSession: serializeCashSession(closedSession as CashSessionRow),
  });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session || session.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const parsed = cashSessionActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Les informations de caisse sont invalides.", 400);
  }

  if (parsed.data.action === "open") {
    return openCashSession(session, parsed.data);
  }

  return closeCashSession(session, parsed.data);
}
