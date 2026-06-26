import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const optionalTextSchema = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((value) => (value ? value : null));

const ownerSupplierSchema = z.object({
  businessId: z.uuid(),
  name: z.string().trim().min(2).max(160),
  phone: optionalTextSchema,
  email: z
    .string()
    .trim()
    .email()
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
});

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = ownerSupplierSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations du fournisseur sont invalides." },
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

  const { data: supplier, error } = await supabaseAdmin
    .from("suppliers")
    .insert({
      business_id: input.businessId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      is_active: true,
      metadata: {
        source: "owner_suppliers",
        created_by: owner.profileId,
      },
    })
    .select("id, name")
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return NextResponse.json(
      {
        error: conflict
          ? "Ce fournisseur existe déjà."
          : "Le fournisseur n'a pas pu être créé.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: input.businessId,
    user_id: owner.profileId,
    action: "supplier.created",
    table_name: "suppliers",
    record_id: supplier.id,
    new_values: {
      name: input.name,
      phone: input.phone,
      email: input.email,
    },
  });

  return NextResponse.json({ supplier }, { status: 201 });
}
