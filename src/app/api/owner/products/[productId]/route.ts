import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ productId: string }>;
};

type AuthorizedOwner = NonNullable<Awaited<ReturnType<typeof getOwnerSession>>>;

type AuthorizedProduct = {
  id: string;
  business_id: string;
  name: string;
};

type AuthorizedProductResult =
  | { response: NextResponse }
  | { owner: AuthorizedOwner; product: AuthorizedProduct };

const optionalTextSchema = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value ? value : null));

const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(140),
  categoryName: optionalTextSchema,
  sku: optionalTextSchema,
  barcode: optionalTextSchema,
  costPrice: z.coerce.number().min(0).max(999_999_999),
  sellingPrice: z.coerce.number().min(0.01).max(999_999_999),
  taxRate: z.coerce.number().min(0).max(100),
  lowStockThreshold: z.coerce.number().int().min(0).max(1_000_000),
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

async function getAuthorizedProduct(
  productId: string,
  existingOwner?: Awaited<ReturnType<typeof getOwnerSession>>,
): Promise<AuthorizedProductResult> {
  const owner = existingOwner ?? (await getOwnerSession());
  if (!owner || owner.mustChangePassword) {
    return {
      response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }),
    };
  }

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("id, business_id, name")
    .eq("id", productId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return {
      response: NextResponse.json(
        { error: "Le produit n'a pas pu être vérifié." },
        { status: 500 },
      ),
    };
  }

  if (!product) {
    return {
      response: NextResponse.json(
        { error: "Produit introuvable." },
        { status: 404 },
      ),
    };
  }

  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === product.business_id,
  );
  if (!ownsBusiness) {
    return {
      response: NextResponse.json(
        { error: "Entreprise non autorisée." },
        { status: 403 },
      ),
    };
  }

  return { owner, product };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const parsedProductId = z.uuid().safeParse(productId);
  if (!parsedProductId.success) {
    return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  }

  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = updateProductSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations du produit sont invalides." },
      { status: 400 },
    );
  }

  const authorized = await getAuthorizedProduct(parsedProductId.data, owner);
  if ("response" in authorized) return authorized.response;

  try {
    const input = parsed.data;
    const categoryId = await findOrCreateCategory({
      businessId: authorized.product.business_id,
      categoryName: input.categoryName,
    });

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .update({
        category_id: categoryId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        cost_price: input.costPrice,
        selling_price: input.sellingPrice,
        tax_rate: input.taxRate,
        low_stock_threshold: input.lowStockThreshold,
      })
      .eq("id", parsedProductId.data)
      .select("id, name")
      .single();

    if (error) {
      const conflict = error.code === "23505";
      return NextResponse.json(
        {
          error: conflict
            ? "Un produit avec cette référence existe déjà."
            : "Le produit n'a pas pu être modifié.",
        },
        { status: conflict ? 409 : 500 },
      );
    }

    await supabaseAdmin.from("audit_logs").insert({
      business_id: authorized.product.business_id,
      user_id: authorized.owner.profileId,
      action: "product.updated",
      table_name: "products",
      record_id: parsedProductId.data,
      new_values: input,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Modification produit Owner interrompue", error);
    return NextResponse.json(
      { error: "La modification du produit a échoué." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { productId } = await context.params;
  const parsedProductId = z.uuid().safeParse(productId);
  if (!parsedProductId.success) {
    return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  }

  const authorized = await getAuthorizedProduct(parsedProductId.data);
  if ("response" in authorized) return authorized.response;

  const { error } = await supabaseAdmin
    .from("products")
    .update({ is_active: false })
    .eq("id", parsedProductId.data);

  if (error) {
    return NextResponse.json(
      { error: "Le produit n'a pas pu être désactivé." },
      { status: 500 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: authorized.product.business_id,
    user_id: authorized.owner.profileId,
    action: "product.deactivated",
    table_name: "products",
    record_id: parsedProductId.data,
  });

  return NextResponse.json({ success: true });
}
