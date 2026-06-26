import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const optionalTextSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value ? value : null));

const ownerProductSchema = z.object({
  businessId: z.uuid(),
  storeId: z.uuid(),
  name: z.string().trim().min(2).max(140),
  categoryName: optionalTextSchema,
  sku: optionalTextSchema,
  barcode: optionalTextSchema,
  costPrice: z.coerce.number().min(0).max(999_999_999),
  sellingPrice: z.coerce.number().min(0.01).max(999_999_999),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000).default(5),
});

function createCategorySlug(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug || "categorie";
}

async function findOrCreateCategory(input: {
  businessId: string;
  categoryName: string | null;
}) {
  if (!input.categoryName) return null;

  const slug = createCategorySlug(input.categoryName);
  const existing = await supabaseAdmin
    .from("product_categories")
    .select("id")
    .eq("business_id", input.businessId)
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.id) return existing.data.id as string;

  const created = await supabaseAdmin
    .from("product_categories")
    .insert({
      business_id: input.businessId,
      name: input.categoryName,
      slug,
      color: "#0B7A4B",
      is_active: true,
    })
    .select("id")
    .single();

  if (created.error) throw new Error(created.error.message);
  return created.data.id as string;
}

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = ownerProductSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations du produit sont invalides." },
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

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, business_id")
    .eq("id", input.storeId)
    .eq("business_id", input.businessId)
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

  try {
    const categoryId = await findOrCreateCategory({
      businessId: input.businessId,
      categoryName: input.categoryName,
    });

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        business_id: input.businessId,
        category_id: categoryId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        product_type: "physical",
        unit_name: "unité",
        cost_price: input.costPrice,
        selling_price: input.sellingPrice,
        tax_rate: input.taxRate,
        track_inventory: true,
        low_stock_threshold: input.lowStockThreshold,
        is_active: true,
        metadata: {
          source: "owner_products",
          created_by: owner.profileId,
        },
      })
      .select("id, name")
      .single();

    if (productError) {
      const conflict = productError.code === "23505";
      return NextResponse.json(
        {
          error: conflict
            ? "Un produit avec cette référence existe déjà."
            : "Le produit n'a pas pu être créé.",
        },
        { status: conflict ? 409 : 500 },
      );
    }

    const { error: stockError } = await supabaseAdmin
      .from("product_stock")
      .insert({
        business_id: input.businessId,
        store_id: input.storeId,
        product_id: product.id,
        quantity: input.quantity,
        reserved_quantity: 0,
      });

    if (stockError) {
      await supabaseAdmin
        .from("products")
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", product.id);

      return NextResponse.json(
        { error: "Le stock initial n'a pas pu être enregistré." },
        { status: 500 },
      );
    }

    const { error: movementError } = await supabaseAdmin
      .from("stock_movements")
      .insert({
        business_id: input.businessId,
        store_id: input.storeId,
        product_id: product.id,
        movement_type: "opening",
        quantity_delta: input.quantity,
        unit_cost: input.costPrice,
        reason: "Stock initial depuis le catalogue Owner",
        performed_by: owner.profileId,
        metadata: {
          source: "owner_products",
        },
      });

    if (movementError) {
      console.error("Mouvement de stock initial non enregistré", movementError);
    }

    await supabaseAdmin.from("audit_logs").insert({
      business_id: input.businessId,
      user_id: owner.profileId,
      action: "product.created",
      table_name: "products",
      record_id: product.id,
      new_values: {
        name: input.name,
        store_id: input.storeId,
        quantity: input.quantity,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Création produit Owner interrompue", error);
    return NextResponse.json(
      { error: "La création du produit a échoué." },
      { status: 500 },
    );
  }
}
