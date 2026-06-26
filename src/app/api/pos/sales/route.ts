import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const saleItemSchema = z.object({
  productId: postgresUuidSchema,
  quantity: z.number().int().min(1).max(999),
});

const createSaleSchema = z.object({
  storeId: postgresUuidSchema,
  customerId: postgresUuidSchema.nullable().optional(),
  paymentMethodId: postgresUuidSchema.nullable().optional(),
  paymentProvider: z.string().trim().min(1).max(60).default("cash"),
  paymentReference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(saleItemSchema).min(1).max(100),
});

type StoreRow = {
  id: string;
  business_id: string;
  name: string;
};

type ProductRow = {
  id: string;
  business_id: string;
  sku: string | null;
  name: string;
  cost_price: number | string | null;
  selling_price: number | string;
  tax_rate: number | string;
  track_inventory: boolean;
  is_active: boolean;
};

type StockRow = {
  business_id: string;
  store_id: string;
  product_id: string;
  quantity: number | string;
  reserved_quantity: number | string;
};

type PaymentMethodRow = {
  id: string;
  business_id: string;
  provider: string;
  requires_reference: boolean;
};

type CustomerRow = {
  id: string;
  business_id: string;
  loyalty_points: number | string | null;
};

type PosSaleRpcResult = {
  sale_id: string;
  receipt_number: string;
  total_amount: number | string;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function createReceiptNumber() {
  const date = new Date();
  const compactDate = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = `${date.getTime()}`.slice(-6);

  return `POS-${compactDate}-${suffix}`;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isMissingRpcError(message: string) {
  return (
    message.includes("africrm_create_pos_sale") &&
    (message.includes("schema cache") ||
      message.includes("Could not find the function") ||
      message.includes("function") ||
      message.includes("does not exist"))
  );
}

function mapRpcError(message: string) {
  if (message.includes("POS_EMPTY_CART")) {
    return { message: "Le panier est vide.", status: 400 };
  }

  if (message.includes("POS_STORE_NOT_FOUND")) {
    return { message: "Point de vente introuvable ou inactif.", status: 404 };
  }

  if (message.includes("POS_PAYMENT_METHOD_INVALID")) {
    return {
      message: "Le moyen de paiement sélectionné est invalide.",
      status: 400,
    };
  }

  if (message.includes("POS_PAYMENT_REFERENCE_REQUIRED")) {
    return {
      message: "La référence du paiement est obligatoire.",
      status: 400,
    };
  }

  if (message.includes("POS_PRODUCT_INVALID")) {
    return {
      message: "Un produit du panier est introuvable ou inactif.",
      status: 400,
    };
  }

  if (message.includes("POS_STOCK_MISSING")) {
    return {
      message: "Stock introuvable pour un produit du panier.",
      status: 409,
    };
  }

  if (message.includes("POS_STOCK_LOW")) {
    return {
      message: "Stock insuffisant pour finaliser la vente.",
      status: 409,
    };
  }

  return { message: "La vente n’a pas pu être enregistrée.", status: 500 };
}

async function updateCustomerAfterSale(input: {
  customer: CustomerRow | null;
  saleId: string;
  businessId: string;
  totalAmount: number;
}) {
  if (!input.customer) return;

  const earnedPoints = Math.max(1, Math.floor(input.totalAmount / 1000));
  const nextPoints = toNumber(input.customer.loyalty_points) + earnedPoints;

  const { error: saleUpdateError } = await supabaseAdmin
    .from("sales")
    .update({ customer_id: input.customer.id })
    .eq("id", input.saleId);
  if (saleUpdateError) {
    console.error("POS: rattachement client vente impossible", saleUpdateError);
  }

  const { error: customerUpdateError } = await supabaseAdmin
    .from("customers")
    .update({ loyalty_points: nextPoints })
    .eq("id", input.customer.id)
    .eq("business_id", input.businessId);
  if (customerUpdateError) {
    console.error(
      "POS: mise à jour fidélité client impossible",
      customerUpdateError,
    );
  }
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session || session.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const parsed = createSaleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Le panier envoyé est invalide.", 400);
  }

  const input = parsed.data;
  const compactItems = new Map<string, number>();
  for (const item of input.items) {
    compactItems.set(
      item.productId,
      (compactItems.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, business_id, name")
    .eq("id", input.storeId)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (storeError || !store) {
    return jsonError("Point de vente introuvable ou inactif.", 404);
  }

  const storeRow = store as StoreRow;
  if (
    !hasPermission(session, "pos.access", {
      businessId: storeRow.business_id,
      storeId: storeRow.id,
    })
  ) {
    return jsonError("Vous n’avez pas accès à cette caisse.", 403);
  }

  const { data: activeCashSession, error: activeCashSessionError } =
    await supabaseAdmin
      .from("cash_sessions")
      .select("id")
      .eq("store_id", storeRow.id)
      .eq("status", "open")
      .maybeSingle();

  if (activeCashSessionError) {
    console.error(
      "POS: vérification session de caisse impossible",
      activeCashSessionError,
    );
    return jsonError("La session de caisse n'a pas pu être vérifiée.", 500);
  }

  if (!activeCashSession) {
    return jsonError("Ouvrez une session de caisse avant d'encaisser.", 409);
  }

  let customer: CustomerRow | null = null;
  if (input.customerId) {
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, business_id, loyalty_points")
      .eq("id", input.customerId)
      .eq("business_id", storeRow.business_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (customerError) {
      console.error("POS: vérification client impossible", customerError);
      return jsonError("Le client n'a pas pu être vérifié.", 500);
    }
    if (!customerData) {
      return jsonError("Le client sélectionné est invalide.", 400);
    }

    customer = customerData as CustomerRow;
  }

  const { data: rpcSale, error: rpcError } = await supabaseAdmin.rpc(
    "africrm_create_pos_sale",
    {
      p_store_id: input.storeId,
      p_items: [...compactItems.entries()].map(([productId, quantity]) => ({
        product_id: productId,
        quantity,
      })),
      p_payment_method_id: input.paymentMethodId ?? null,
      p_payment_provider: input.paymentProvider,
      p_payment_reference: input.paymentReference ?? null,
      p_notes: input.notes ?? null,
      p_cashier_user_id: session.profileId,
    },
  );

  if (!rpcError && Array.isArray(rpcSale) && rpcSale.length > 0) {
    const sale = rpcSale[0] as PosSaleRpcResult;
    await updateCustomerAfterSale({
      customer,
      saleId: sale.sale_id,
      businessId: storeRow.business_id,
      totalAmount: toNumber(sale.total_amount),
    });

    return NextResponse.json(
      {
        saleId: sale.sale_id,
        receiptNumber: sale.receipt_number,
        totalAmount: toNumber(sale.total_amount),
        transactionMode: "rpc",
      },
      { status: 201 },
    );
  }

  if (rpcError && !isMissingRpcError(rpcError.message)) {
    console.error("POS: vente transactionnelle impossible", rpcError);
    const mappedError = mapRpcError(rpcError.message);

    return jsonError(mappedError.message, mappedError.status);
  }

  if (rpcError) {
    console.warn(
      "POS: fonction africrm_create_pos_sale absente, fallback séquentiel utilisé",
      rpcError.message,
    );
  }

  let paymentMethod: PaymentMethodRow | null = null;
  if (input.paymentMethodId) {
    const { data, error } = await supabaseAdmin
      .from("payment_methods")
      .select("id, business_id, provider, requires_reference")
      .eq("id", input.paymentMethodId)
      .eq("business_id", storeRow.business_id)
      .eq("is_enabled", true)
      .single();

    if (error || !data) {
      return jsonError("Le moyen de paiement sélectionné est invalide.", 400);
    }

    paymentMethod = data as PaymentMethodRow;
    if (paymentMethod.requires_reference && !input.paymentReference) {
      return jsonError("La référence du paiement est obligatoire.", 400);
    }
  } else {
    const fallbackProvider =
      input.paymentProvider === "mobile_money" ? "mobile_money" : "cash";
    const fallbackCode =
      fallbackProvider === "mobile_money" ? "mobile_money" : "cash";
    const fallbackName =
      fallbackProvider === "mobile_money" ? "Mobile Money" : "Espèces";
    const { data: existingPaymentMethod, error: existingPaymentMethodError } =
      await supabaseAdmin
        .from("payment_methods")
        .select("id, business_id, provider, requires_reference")
        .eq("business_id", storeRow.business_id)
        .eq("code", fallbackCode)
        .eq("is_enabled", true)
        .maybeSingle();

    if (existingPaymentMethodError) {
      console.error(
        "POS: recherche moyen de paiement impossible",
        existingPaymentMethodError,
      );
      return jsonError("Le moyen de paiement n’a pas pu être vérifié.", 500);
    }

    if (existingPaymentMethod) {
      paymentMethod = existingPaymentMethod as PaymentMethodRow;
    } else {
      const { data: createdPaymentMethod, error: createdPaymentMethodError } =
        await supabaseAdmin
          .from("payment_methods")
          .insert({
            business_id: storeRow.business_id,
            name: fallbackName,
            code: fallbackCode,
            provider: fallbackProvider,
            is_enabled: true,
            requires_reference: false,
            display_order: fallbackProvider === "cash" ? 1 : 2,
            configuration: {},
          })
          .select("id, business_id, provider, requires_reference")
          .single();

      if (createdPaymentMethodError || !createdPaymentMethod) {
        console.error(
          "POS: création moyen de paiement impossible",
          createdPaymentMethodError,
        );
        return jsonError("Le moyen de paiement n’a pas pu être préparé.", 500);
      }

      paymentMethod = createdPaymentMethod as PaymentMethodRow;
    }
  }

  if (!paymentMethod) {
    return jsonError("Aucun moyen de paiement disponible.", 500);
  }

  const productIds = [...compactItems.keys()];
  const { data: productsData, error: productsError } = await supabaseAdmin
    .from("products")
    .select(
      "id, business_id, sku, name, cost_price, selling_price, tax_rate, track_inventory, is_active",
    )
    .eq("business_id", storeRow.business_id)
    .in("id", productIds)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (productsError) {
    console.error("POS: lecture produits impossible", productsError);
    return jsonError("Impossible de vérifier les produits.", 500);
  }

  const products = (productsData ?? []) as ProductRow[];
  if (products.length !== productIds.length) {
    return jsonError("Un produit du panier est introuvable ou inactif.", 400);
  }

  const trackedProductIds = products
    .filter((product) => product.track_inventory)
    .map((product) => product.id);
  const { data: stocksData, error: stocksError } =
    trackedProductIds.length > 0
      ? await supabaseAdmin
          .from("product_stock")
          .select(
            "business_id, store_id, product_id, quantity, reserved_quantity",
          )
          .eq("business_id", storeRow.business_id)
          .eq("store_id", storeRow.id)
          .in("product_id", trackedProductIds)
      : { data: [], error: null };

  if (stocksError) {
    console.error("POS: lecture stock impossible", stocksError);
    return jsonError("Impossible de vérifier le stock.", 500);
  }

  const stockByProductId = new Map(
    ((stocksData ?? []) as StockRow[]).map((stock) => [
      stock.product_id,
      stock,
    ]),
  );

  for (const product of products) {
    if (!product.track_inventory) continue;

    const quantity = compactItems.get(product.id) ?? 0;
    const stock = stockByProductId.get(product.id);

    if (!stock) {
      return jsonError(`Stock introuvable pour ${product.name}.`, 409);
    }

    const availableStock =
      toNumber(stock.quantity) - toNumber(stock.reserved_quantity);
    if (availableStock < quantity) {
      return jsonError(
        `Stock insuffisant pour ${product.name}. Disponible : ${availableStock}.`,
        409,
      );
    }
  }

  const saleItems = products.map((product) => {
    const quantity = compactItems.get(product.id) ?? 0;
    const unitPrice = toNumber(product.selling_price);
    const taxRate = toNumber(product.tax_rate);
    const taxAmount = unitPrice * quantity * (taxRate / 100);
    const lineTotal = unitPrice * quantity + taxAmount;

    return {
      business_id: storeRow.business_id,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity,
      unit_price: unitPrice,
      unit_cost: toNumber(product.cost_price),
      discount_amount: 0,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      line_total: lineTotal,
      metadata: { product_name: product.name },
    };
  });

  const subtotal = saleItems.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0,
  );
  const taxTotal = saleItems.reduce(
    (total, item) => total + item.tax_amount,
    0,
  );
  const totalAmount = subtotal + taxTotal;
  const receiptNumber = createReceiptNumber();

  try {
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .insert({
        business_id: storeRow.business_id,
        store_id: storeRow.id,
        customer_id: customer?.id ?? null,
        receipt_number: receiptNumber,
        status: "completed",
        payment_status: "completed",
        currency_code: "XOF",
        subtotal,
        total_amount: totalAmount,
        paid_amount: totalAmount,
        notes: input.notes ?? null,
        metadata: {
          source: "africrm_pos",
          tax_total: taxTotal,
          cashier_user_id: session.profileId,
        },
      })
      .select("id, receipt_number, total_amount")
      .single();

    if (saleError || !sale) {
      console.error("POS: création vente impossible", saleError);
      return jsonError("La vente n’a pas pu être enregistrée.", 500);
    }

    const saleRow = sale as {
      id: string;
      receipt_number: string | null;
      total_amount: number | string;
    };
    const { error: saleItemsError } = await supabaseAdmin
      .from("sale_items")
      .insert(
        saleItems.map((item) => ({
          ...item,
          sale_id: saleRow.id,
        })),
      );

    if (saleItemsError) {
      console.error("POS: lignes de vente impossibles", saleItemsError);
      await supabaseAdmin
        .from("sales")
        .update({ status: "cancelled", payment_status: "failed" })
        .eq("id", saleRow.id);
      return jsonError(
        "Les lignes de vente n’ont pas pu être enregistrées.",
        500,
      );
    }

    const paymentProvider = paymentMethod?.provider ?? input.paymentProvider;
    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .insert({
        business_id: storeRow.business_id,
        sale_id: saleRow.id,
        payment_method_id: paymentMethod.id,
        status: "completed",
        amount: totalAmount,
        currency_code: "XOF",
        provider: paymentProvider,
        provider_reference: input.paymentReference ?? null,
        paid_at: new Date().toISOString(),
        created_by: session.profileId,
      });

    if (paymentError) {
      console.error("POS: paiement impossible", paymentError);
      await supabaseAdmin
        .from("sales")
        .update({ status: "cancelled", payment_status: "failed" })
        .eq("id", saleRow.id);
      return jsonError("Le paiement n’a pas pu être enregistré.", 500);
    }

    for (const product of products.filter((entry) => entry.track_inventory)) {
      const quantity = compactItems.get(product.id) ?? 0;
      const stock = stockByProductId.get(product.id);
      if (!stock) continue;

      const nextQuantity = toNumber(stock.quantity) - quantity;
      const { error: stockUpdateError } = await supabaseAdmin
        .from("product_stock")
        .update({ quantity: nextQuantity })
        .eq("business_id", storeRow.business_id)
        .eq("store_id", storeRow.id)
        .eq("product_id", product.id);

      if (stockUpdateError) {
        console.error("POS: mise à jour stock impossible", stockUpdateError);
        await supabaseAdmin
          .from("sales")
          .update({ status: "cancelled", payment_status: "failed" })
          .eq("id", saleRow.id);
        return jsonError("Le stock n’a pas pu être mis à jour.", 500);
      }
    }

    const stockMovements = products
      .filter((product) => product.track_inventory)
      .map((product) => ({
        business_id: storeRow.business_id,
        store_id: storeRow.id,
        product_id: product.id,
        movement_type: "sale",
        quantity_delta: -(compactItems.get(product.id) ?? 0),
        unit_cost: toNumber(product.cost_price),
        reference_type: "sale",
        reference_id: saleRow.id,
        reason: `Vente POS ${saleRow.receipt_number ?? receiptNumber}`,
        performed_by: session.profileId,
        metadata: { source: "africrm_pos" },
      }));

    if (stockMovements.length > 0) {
      const { error: movementsError } = await supabaseAdmin
        .from("stock_movements")
        .insert(stockMovements);

      if (movementsError) {
        console.error("POS: mouvements stock impossibles", movementsError);
      }
    }

    await updateCustomerAfterSale({
      customer,
      saleId: saleRow.id,
      businessId: storeRow.business_id,
      totalAmount: toNumber(saleRow.total_amount),
    });

    return NextResponse.json(
      {
        saleId: saleRow.id,
        receiptNumber: saleRow.receipt_number ?? receiptNumber,
        totalAmount: toNumber(saleRow.total_amount),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STOCK_MISSING:")) {
      return jsonError(
        `Stock introuvable pour ${error.message.replace("STOCK_MISSING:", "")}.`,
        409,
      );
    }

    if (error instanceof Error && error.message.startsWith("STOCK_LOW:")) {
      const [, productName, availableStock] = error.message.split(":");
      return jsonError(
        `Stock insuffisant pour ${productName}. Disponible : ${availableStock}.`,
        409,
      );
    }

    console.error("POS: erreur inattendue", error);
    return jsonError("La vente a échoué.", 500);
  }
}
