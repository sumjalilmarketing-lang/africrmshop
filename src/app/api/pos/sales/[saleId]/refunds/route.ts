import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ saleId: string }>;
};

const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const refundSaleSchema = z.object({
  action: z.enum(["cancel", "refund"]),
  reason: z.string().trim().min(5).max(500),
  restock: z.boolean().default(true),
});

type SaleRow = {
  id: string;
  business_id: string;
  store_id: string;
  receipt_number: string | null;
  status: string;
  payment_status: string;
  total_amount: number | string;
  metadata: Record<string, unknown> | null;
};

type SaleItemRow = {
  id: string;
  business_id: string;
  product_id: string | null;
  quantity: number | string;
  unit_cost: number | string | null;
  product_name: string;
};

type ProductRow = {
  id: string;
  track_inventory: boolean;
};

type ProductStockRow = {
  product_id: string;
  quantity: number | string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function restoreStock(input: {
  sale: SaleRow;
  saleItems: SaleItemRow[];
  userId: string;
  reason: string;
}) {
  const productIds = [
    ...new Set(
      input.saleItems
        .map((item) => item.product_id)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  ];

  if (productIds.length === 0) return;

  const [productsResult, stocksResult] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, track_inventory")
      .eq("business_id", input.sale.business_id)
      .in("id", productIds),
    supabaseAdmin
      .from("product_stock")
      .select("product_id, quantity")
      .eq("business_id", input.sale.business_id)
      .eq("store_id", input.sale.store_id)
      .in("product_id", productIds),
  ]);

  if (productsResult.error || stocksResult.error) {
    throw new Error(
      productsResult.error?.message ?? stocksResult.error?.message,
    );
  }

  const trackedProducts = new Set(
    ((productsResult.data ?? []) as ProductRow[])
      .filter((product) => product.track_inventory)
      .map((product) => product.id),
  );
  const stocksByProductId = new Map(
    ((stocksResult.data ?? []) as ProductStockRow[]).map((stock) => [
      stock.product_id,
      stock,
    ]),
  );

  for (const item of input.saleItems) {
    if (!item.product_id || !trackedProducts.has(item.product_id)) continue;

    const currentStock = stocksByProductId.get(item.product_id);
    const restoredQuantity = toNumber(item.quantity);
    const nextQuantity = toNumber(currentStock?.quantity) + restoredQuantity;

    if (currentStock) {
      const { error: stockUpdateError } = await supabaseAdmin
        .from("product_stock")
        .update({ quantity: nextQuantity })
        .eq("business_id", input.sale.business_id)
        .eq("store_id", input.sale.store_id)
        .eq("product_id", item.product_id);

      if (stockUpdateError) throw new Error(stockUpdateError.message);
    } else {
      const { error: stockInsertError } = await supabaseAdmin
        .from("product_stock")
        .insert({
          business_id: input.sale.business_id,
          store_id: input.sale.store_id,
          product_id: item.product_id,
          quantity: restoredQuantity,
          reserved_quantity: 0,
        });

      if (stockInsertError) throw new Error(stockInsertError.message);
    }

    const { error: movementError } = await supabaseAdmin
      .from("stock_movements")
      .insert({
        business_id: input.sale.business_id,
        store_id: input.sale.store_id,
        product_id: item.product_id,
        movement_type: "adjustment",
        quantity_delta: restoredQuantity,
        unit_cost: toNumber(item.unit_cost),
        reference_type: "sale_refund",
        reference_id: input.sale.id,
        reason: input.reason,
        performed_by: input.userId,
        metadata: {
          source: "africrm_pos_18",
          sale_id: input.sale.id,
          sale_item_id: item.id,
          product_name: item.product_name,
        },
      });

    if (movementError) throw new Error(movementError.message);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getAppSession();
  if (!session || session.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const { saleId } = await context.params;
  if (!postgresUuidSchema.safeParse(saleId).success) {
    return jsonError("Vente invalide.", 400);
  }

  const parsed = refundSaleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Les informations d'annulation sont invalides.", 400);
  }

  const input = parsed.data;
  const { data: saleData, error: saleError } = await supabaseAdmin
    .from("sales")
    .select(
      "id, business_id, store_id, receipt_number, status, payment_status, total_amount, metadata",
    )
    .eq("id", saleId)
    .maybeSingle();

  if (saleError) {
    console.error("POS: lecture vente remboursement impossible", saleError);
    return jsonError("La vente n'a pas pu être vérifiée.", 500);
  }

  if (!saleData) {
    return jsonError("Vente introuvable.", 404);
  }

  const sale = saleData as SaleRow;
  if (
    !hasPermission(session, "pos.access", {
      businessId: sale.business_id,
      storeId: sale.store_id,
    })
  ) {
    return jsonError("Vous n'avez pas accès à cette vente.", 403);
  }

  if (sale.status !== "completed") {
    return jsonError(
      "Seules les ventes encaissées peuvent être traitées.",
      409,
    );
  }

  const { data: saleItemsData, error: saleItemsError } = await supabaseAdmin
    .from("sale_items")
    .select("id, business_id, product_id, quantity, unit_cost, product_name")
    .eq("sale_id", sale.id)
    .eq("business_id", sale.business_id);

  if (saleItemsError) {
    console.error("POS: lecture lignes vente impossible", saleItemsError);
    return jsonError("Les lignes de vente n'ont pas pu être vérifiées.", 500);
  }

  if (input.restock) {
    try {
      await restoreStock({
        sale,
        saleItems: (saleItemsData ?? []) as SaleItemRow[],
        userId: session.profileId,
        reason:
          input.action === "cancel"
            ? `Annulation vente ${sale.receipt_number ?? sale.id}: ${input.reason}`
            : `Remboursement vente ${sale.receipt_number ?? sale.id}: ${input.reason}`,
      });
    } catch (error) {
      console.error("POS: remise en stock remboursement impossible", error);
      return jsonError("La remise en stock n'a pas pu être effectuée.", 500);
    }
  }

  const nextSaleStatus = input.action === "cancel" ? "cancelled" : "refunded";
  const nextMetadata = {
    ...(sale.metadata ?? {}),
    pos18: {
      action: input.action,
      reason: input.reason,
      restock: input.restock,
      processed_by: session.profileId,
      processed_at: new Date().toISOString(),
    },
  };
  const { error: saleUpdateError } = await supabaseAdmin
    .from("sales")
    .update({
      status: nextSaleStatus,
      payment_status: "refunded",
      metadata: nextMetadata,
    })
    .eq("id", sale.id)
    .eq("status", "completed");

  if (saleUpdateError) {
    console.error(
      "POS: mise à jour vente remboursement impossible",
      saleUpdateError,
    );
    return jsonError("La vente n'a pas pu être mise à jour.", 500);
  }

  const { error: paymentUpdateError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "refunded",
    })
    .eq("sale_id", sale.id)
    .eq("business_id", sale.business_id);

  if (paymentUpdateError) {
    console.error(
      "POS: mise à jour paiement remboursement impossible",
      paymentUpdateError,
    );
    return jsonError("Le paiement n'a pas pu être mis à jour.", 500);
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: sale.business_id,
    user_id: session.profileId,
    action: input.action === "cancel" ? "sale.cancelled" : "sale.refunded",
    table_name: "sales",
    record_id: sale.id,
    old_values: {
      status: sale.status,
      payment_status: sale.payment_status,
    },
    new_values: {
      status: nextSaleStatus,
      payment_status: "refunded",
      reason: input.reason,
      restock: input.restock,
      total_amount: toNumber(sale.total_amount),
    },
  });

  return NextResponse.json({
    saleId: sale.id,
    receiptNumber: sale.receipt_number,
    status: nextSaleStatus,
    paymentStatus: "refunded",
    restocked: input.restock,
  });
}
