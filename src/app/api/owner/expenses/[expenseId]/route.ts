import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

const expenseIdSchema = z.uuid();
const expenseActionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "mark_paid", "cancel"]),
  rejectionReason: z.string().trim().min(5).max(300).optional(),
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const { expenseId } = await context.params;
  if (!expenseIdSchema.safeParse(expenseId).success) {
    return jsonError("Dépense invalide.", 400);
  }

  const parsed = expenseActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Action invalide.", 400);
  }

  const { data: expense, error: expenseError } = await supabaseAdmin
    .from("expenses")
    .select("id, business_id, status")
    .eq("id", expenseId)
    .maybeSingle();

  if (expenseError) {
    return jsonError("La dépense n'a pas pu être vérifiée.", 500);
  }
  if (!expense) {
    return jsonError("Dépense introuvable.", 404);
  }

  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === expense.business_id,
  );
  if (!ownsBusiness) {
    return jsonError("Entreprise non autorisée.", 403);
  }

  const now = new Date().toISOString();
  const input = parsed.data;
  const updates =
    input.action === "submit"
      ? { status: "pending" }
      : input.action === "approve"
        ? {
            status: "approved",
            approved_by: owner.profileId,
            approved_at: now,
            rejection_reason: null,
          }
        : input.action === "reject"
          ? {
              status: "rejected",
              approved_by: owner.profileId,
              approved_at: now,
              rejection_reason:
                input.rejectionReason ?? "Rejetée depuis AFRICRM Shop",
            }
          : input.action === "mark_paid"
            ? { status: "paid", paid_at: now }
            : { status: "cancelled" };

  const { data: updatedExpense, error: updateError } = await supabaseAdmin
    .from("expenses")
    .update(updates)
    .eq("id", expenseId)
    .select("id, status")
    .single();

  if (updateError) {
    console.error("POS23: mise à jour dépense impossible", updateError);
    return jsonError("La dépense n'a pas pu être mise à jour.", 500);
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: expense.business_id,
    user_id: owner.profileId,
    action: `expense.${input.action}`,
    table_name: "expenses",
    record_id: expenseId,
    old_values: { status: expense.status },
    new_values: updates,
  });

  return NextResponse.json({ expense: updatedExpense });
}
