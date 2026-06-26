import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const postgresUuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const optionalTextSchema = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((value) => (value ? value : null));

const createPosCustomerSchema = z.object({
  storeId: postgresUuidSchema,
  firstName: optionalTextSchema,
  lastName: optionalTextSchema,
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

function createCustomerCode() {
  return `CLI-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now()
    .toString()
    .slice(-5)}`;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const session = await getAppSession();
  if (!session || session.mustChangePassword) {
    return jsonError("Accès refusé.", 403);
  }

  const parsed = createPosCustomerSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Les informations client sont invalides.", 400);
  }

  const input = parsed.data;
  if (!input.firstName && !input.lastName && !input.phone && !input.email) {
    return jsonError("Renseignez au moins un nom, téléphone ou e-mail.", 400);
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, business_id")
    .eq("id", input.storeId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (storeError || !store) {
    return jsonError("Point de vente introuvable ou inactif.", 404);
  }

  if (
    !hasPermission(session, "pos.access", {
      businessId: store.business_id,
      storeId: store.id,
    })
  ) {
    return jsonError("Vous n'avez pas accès à cette caisse.", 403);
  }

  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .insert({
      business_id: store.business_id,
      customer_code: createCustomerCode(),
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      whatsapp_phone: input.phone,
      country_code: "SN",
      loyalty_points: 0,
      credit_limit: 0,
      outstanding_balance: 0,
      tags: [],
      marketing_consent: false,
      whatsapp_consent: Boolean(input.phone),
      metadata: {
        source: "africrm_pos",
        created_by: session.profileId,
        store_id: input.storeId,
      },
    })
    .select(
      "id, business_id, customer_code, first_name, last_name, company_name, email, phone, whatsapp_phone, loyalty_points, created_at",
    )
    .single();

  if (error) {
    const conflict = error.code === "23505";
    return jsonError(
      conflict ? "Ce client existe déjà." : "Le client n'a pas pu être créé.",
      conflict ? 409 : 500,
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: store.business_id,
    user_id: session.profileId,
    action: "customer.created_from_pos",
    table_name: "customers",
    record_id: customer.id,
    new_values: {
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      email: input.email,
      store_id: input.storeId,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
