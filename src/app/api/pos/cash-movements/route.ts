import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const createCashMovementSchema = z.object({
  cashSessionId: postgresUuidSchema,
  movementType: z.enum(["cash_in", "cash_out", "deposit", "withdrawal"]),
  amount: z.number().min(1).max(999_999_999),
  reason: z.string().trim().min(3).max(240),
});

type CashSessionRow = {
  id: string;
  business_id: string;
  store_id: string;
  status: string;
};

type CashMovementRow = {
  id: string;
  business_id: string;
  cash_session_id: string;
  movement_type: string;
  amount: number | string;
  reason: string;
  performed_by: string | null;
  created_at: string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function serializeCashMovement(movement: CashMovementRow) {
  return {
    id: movement.id,
    businessId: movement.business_id,
    cashSessionId: movement.cash_session_id,
    movementType: movement.movement_type,
    amount: toNumber(movement.amount),
    reason: movement.reason,
    performedBy: movement.performed_by,
    createdAt: movement.created_at,
  };
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session || session.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const parsed = createCashMovementSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Le mouvement de caisse est invalide.", 400);
  }

  const input = parsed.data;
  const { data: cashSession, error: cashSessionError } = await supabaseAdmin
    .from("cash_sessions")
    .select("id, business_id, store_id, status")
    .eq("id", input.cashSessionId)
    .eq("status", "open")
    .maybeSingle();

  if (cashSessionError) {
    console.error(
      "POS: vérification session caisse impossible",
      cashSessionError,
    );
    return jsonError("Impossible de vérifier la session de caisse.", 500);
  }

  if (!cashSession) {
    return jsonError("Aucune session de caisse ouverte trouvée.", 404);
  }

  const cashSessionRow = cashSession as CashSessionRow;
  if (
    !hasPermission(session, "pos.access", {
      businessId: cashSessionRow.business_id,
      storeId: cashSessionRow.store_id,
    })
  ) {
    return jsonError("Vous n'avez pas accès à cette caisse.", 403);
  }

  const { data: movement, error } = await supabaseAdmin
    .from("cash_movements")
    .insert({
      business_id: cashSessionRow.business_id,
      cash_session_id: cashSessionRow.id,
      movement_type: input.movementType,
      amount: input.amount,
      reason: input.reason,
      performed_by: session.profileId,
    })
    .select(
      "id, business_id, cash_session_id, movement_type, amount, reason, performed_by, created_at",
    )
    .single();

  if (error || !movement) {
    console.error("POS: création mouvement de caisse impossible", error);
    return jsonError("Le mouvement de caisse n'a pas pu être enregistré.", 500);
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: cashSessionRow.business_id,
    user_id: session.profileId,
    action: "cash_movement.created",
    table_name: "cash_movements",
    record_id: movement.id,
    new_values: {
      cash_session_id: cashSessionRow.id,
      store_id: cashSessionRow.store_id,
      movement_type: input.movementType,
      amount: input.amount,
      reason: input.reason,
    },
  });

  return NextResponse.json(
    { cashMovement: serializeCashMovement(movement as CashMovementRow) },
    { status: 201 },
  );
}
