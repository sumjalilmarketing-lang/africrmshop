import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const optionalReferenceSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value ? value : null));

const stockReceptionSchema = z.object({
  businessId: z.uuid(),
  storeId: z.uuid(),
  productId: z.uuid(),
  supplierId: z
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  unitCost: z.coerce.number().min(0).max(999_999_999),
  reference: optionalReferenceSchema,
  notes: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((value) => (value ? value : null)),
});

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = stockReceptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations de réception sont invalides." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === input.businessId,
  );
  if (!ownsBusiness) {
    return NextResponse.json(
      { error: "Entreprise non autorisée." },
      { status: 403 },
    );
  }

  const [storeResult, productResult, supplierResult] = await Promise.all([
    supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", input.storeId)
      .eq("business_id", input.businessId)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle(),
    supabaseAdmin
      .from("products")
      .select("id, name")
      .eq("id", input.productId)
      .eq("business_id", input.businessId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle(),
    input.supplierId
      ? supabaseAdmin
          .from("suppliers")
          .select("id, name")
          .eq("id", input.supplierId)
          .eq("business_id", input.businessId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (storeResult.error || productResult.error || supplierResult.error) {
    return NextResponse.json(
      { error: "Les références de réception n'ont pas pu être vérifiées." },
      { status: 500 },
    );
  }
  if (!storeResult.data) {
    return NextResponse.json(
      { error: "La boutique sélectionnée est invalide." },
      { status: 400 },
    );
  }
  if (!productResult.data) {
    return NextResponse.json(
      { error: "Le produit sélectionné est invalide." },
      { status: 400 },
    );
  }
  if (input.supplierId && !supplierResult.data) {
    return NextResponse.json(
      { error: "Le fournisseur sélectionné est invalide." },
      { status: 400 },
    );
  }

  const { data: currentStock, error: stockError } = await supabaseAdmin
    .from("product_stock")
    .select("id, quantity, reserved_quantity")
    .eq("business_id", input.businessId)
    .eq("store_id", input.storeId)
    .eq("product_id", input.productId)
    .maybeSingle();

  if (stockError) {
    return NextResponse.json(
      { error: "Le stock actuel n'a pas pu être vérifié." },
      { status: 500 },
    );
  }

  const currentQuantity = Number(currentStock?.quantity ?? 0);
  const nextQuantity = currentQuantity + input.quantity;
  const stockMutation = currentStock
    ? supabaseAdmin
        .from("product_stock")
        .update({ quantity: nextQuantity })
        .eq("id", currentStock.id)
    : supabaseAdmin.from("product_stock").insert({
        business_id: input.businessId,
        store_id: input.storeId,
        product_id: input.productId,
        quantity: nextQuantity,
        reserved_quantity: 0,
      });
  const { error: mutationError } = await stockMutation;

  if (mutationError) {
    return NextResponse.json(
      { error: "La réception de stock n'a pas pu être enregistrée." },
      { status: 500 },
    );
  }

  const { error: costError } = await supabaseAdmin
    .from("products")
    .update({ cost_price: input.unitCost })
    .eq("id", input.productId);
  if (costError) {
    console.error("Mise à jour du coût produit non enregistrée", costError);
  }

  const { error: movementError } = await supabaseAdmin
    .from("stock_movements")
    .insert({
      business_id: input.businessId,
      store_id: input.storeId,
      product_id: input.productId,
      movement_type: "purchase",
      quantity_delta: input.quantity,
      unit_cost: input.unitCost,
      reference_type: input.reference ? "supplier_invoice" : null,
      reference_id: null,
      reason:
        input.notes ??
        `Réception fournisseur${supplierResult.data?.name ? ` - ${supplierResult.data.name}` : ""}`,
      performed_by: owner.profileId,
      metadata: {
        source: "owner_stock_reception",
        supplier_id: input.supplierId,
        supplier_name: supplierResult.data?.name ?? null,
        reference: input.reference,
        previous_quantity: currentQuantity,
        next_quantity: nextQuantity,
      },
    });

  if (movementError) {
    console.error(
      "Mouvement de réception fournisseur non enregistré",
      movementError,
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: input.businessId,
    user_id: owner.profileId,
    action: "stock.received",
    table_name: "product_stock",
    record_id: currentStock?.id ?? null,
    new_values: {
      product_id: input.productId,
      product_name: productResult.data.name,
      store_id: input.storeId,
      supplier_id: input.supplierId,
      quantity: input.quantity,
      unit_cost: input.unitCost,
      previous_quantity: currentQuantity,
      next_quantity: nextQuantity,
      reference: input.reference,
    },
  });

  return NextResponse.json({
    reception: {
      productId: input.productId,
      storeId: input.storeId,
      supplierId: input.supplierId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      nextQuantity,
    },
  });
}
