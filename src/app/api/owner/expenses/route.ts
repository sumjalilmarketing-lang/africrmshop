import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const optionalUuidSchema = z
  .union([z.uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalTextSchema = z
  .string()
  .trim()
  .max(240)
  .optional()
  .transform((value) => (value ? value : null));

const ownerExpenseSchema = z.object({
  businessId: z.uuid(),
  storeId: optionalUuidSchema,
  category: z.string().trim().min(2).max(80),
  description: optionalTextSchema,
  reference: optionalTextSchema,
  amountExcludingTax: z.coerce.number().min(0).max(999_999_999),
  taxAmount: z.coerce.number().min(0).max(999_999_999).default(0),
  expenseDate: z.string().trim().min(10).max(10),
  dueDate: z
    .union([z.string().trim().min(10).max(10), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  status: z.enum(["draft", "pending"]).default("draft"),
});

function createExpenseNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `EXP-${date}-${suffix}`;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const parsed = ownerExpenseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Les informations de dépense sont invalides.", 400);
  }

  const input = parsed.data;
  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === input.businessId,
  );
  if (!ownsBusiness) {
    return jsonError("Entreprise non autorisée.", 403);
  }

  if (input.storeId) {
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", input.storeId)
      .eq("business_id", input.businessId)
      .is("deleted_at", null)
      .maybeSingle();

    if (storeError) {
      return jsonError("La boutique n'a pas pu être vérifiée.", 500);
    }
    if (!store) {
      return jsonError("La boutique sélectionnée est invalide.", 400);
    }
  }

  const totalAmount = input.amountExcludingTax + input.taxAmount;
  const { data: expense, error } = await supabaseAdmin
    .from("expenses")
    .insert({
      business_id: input.businessId,
      store_id: input.storeId,
      expense_number: createExpenseNumber(),
      category: input.category,
      description: input.description,
      reference: input.reference,
      status: input.status,
      amount_excluding_tax: input.amountExcludingTax,
      tax_amount: input.taxAmount,
      total_amount: totalAmount,
      currency_code: "XOF",
      expense_date: input.expenseDate,
      due_date: input.dueDate,
      created_by: owner.profileId,
      metadata: {
        source: "owner_expenses_pos23",
      },
    })
    .select("id, expense_number")
    .single();

  if (error) {
    console.error("POS23: création dépense impossible", error);
    return jsonError("La dépense n'a pas pu être enregistrée.", 500);
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: input.businessId,
    user_id: owner.profileId,
    action: "expense.created",
    table_name: "expenses",
    record_id: expense.id,
    new_values: {
      category: input.category,
      total_amount: totalAmount,
      status: input.status,
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
