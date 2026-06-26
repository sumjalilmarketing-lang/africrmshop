import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

const stockAdjustmentSchema = z.object({
  storeId: z.uuid(),
  quantityDelta: z.coerce.number().int().min(-1_000_000).max(1_000_000),
  reason: z.string().trim().min(3).max(200),
});

export async function POST(request: Request, context: RouteContext) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { productId } = await context.params;
  const parsedProductId = z.uuid().safeParse(productId);
  if (!parsedProductId.success) {
    return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  }

  const parsed = stockAdjustmentSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || parsed.data.quantityDelta === 0) {
    return NextResponse.json(
      { error: "L'ajustement de stock est invalide." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, business_id, cost_price")
    .eq("id", parsedProductId.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (productError) {
    return NextResponse.json(
      { error: "Le produit n'a pas pu être vérifié." },
      { status: 500 },
    );
  }
  if (!product) {
    return NextResponse.json(
      { error: "Produit introuvable." },
      { status: 404 },
    );
  }

  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === product.business_id,
  );
  if (!ownsBusiness) {
    return NextResponse.json(
      { error: "Entreprise non autorisée." },
      { status: 403 },
    );
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", input.storeId)
    .eq("business_id", product.business_id)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (storeError) {
    return NextResponse.json(
      { error: "La boutique n'a pas pu être vérifiée." },
      { status: 500 },
    );
  }
  if (!store) {
    return NextResponse.json(
      { error: "La boutique sélectionnée est invalide." },
      { status: 400 },
    );
  }

  const { data: currentStock, error: stockError } = await supabaseAdmin
    .from("product_stock")
    .select("id, quantity, reserved_quantity")
    .eq("business_id", product.business_id)
    .eq("store_id", input.storeId)
    .eq("product_id", parsedProductId.data)
    .maybeSingle();

  if (stockError) {
    return NextResponse.json(
      { error: "Le stock actuel n'a pas pu être vérifié." },
      { status: 500 },
    );
  }

  const currentQuantity = Number(currentStock?.quantity ?? 0);
  const reservedQuantity = Number(currentStock?.reserved_quantity ?? 0);
  const nextQuantity = currentQuantity + input.quantityDelta;
  if (nextQuantity < reservedQuantity || nextQuantity < 0) {
    return NextResponse.json(
      { error: "Le stock ne peut pas devenir négatif." },
      { status: 409 },
    );
  }

  const stockMutation = currentStock
    ? supabaseAdmin
        .from("product_stock")
        .update({ quantity: nextQuantity })
        .eq("id", currentStock.id)
    : supabaseAdmin.from("product_stock").insert({
        business_id: product.business_id,
        store_id: input.storeId,
        product_id: parsedProductId.data,
        quantity: nextQuantity,
        reserved_quantity: 0,
      });
  const { error: mutationError } = await stockMutation;

  if (mutationError) {
    return NextResponse.json(
      { error: "Le stock n'a pas pu être ajusté." },
      { status: 500 },
    );
  }

  const { error: movementError } = await supabaseAdmin
    .from("stock_movements")
    .insert({
      business_id: product.business_id,
      store_id: input.storeId,
      product_id: parsedProductId.data,
      movement_type: "adjustment",
      quantity_delta: input.quantityDelta,
      unit_cost: product.cost_price,
      reason: input.reason,
      performed_by: owner.profileId,
      metadata: {
        source: "owner_stock_adjustment",
        previous_quantity: currentQuantity,
        next_quantity: nextQuantity,
      },
    });

  if (movementError) {
    console.error(
      "Mouvement d'ajustement de stock non enregistré",
      movementError,
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: product.business_id,
    user_id: owner.profileId,
    action: "stock.adjusted",
    table_name: "product_stock",
    record_id: currentStock?.id ?? null,
    new_values: {
      product_id: parsedProductId.data,
      store_id: input.storeId,
      quantity_delta: input.quantityDelta,
      previous_quantity: currentQuantity,
      next_quantity: nextQuantity,
      reason: input.reason,
    },
  });

  return NextResponse.json({
    stock: {
      productId: parsedProductId.data,
      storeId: input.storeId,
      quantity: nextQuantity,
      reservedQuantity,
    },
  });
}
