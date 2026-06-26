import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const customerNoteSchema = z.object({
  businessId: z.uuid(),
  customerId: z.uuid(),
  note: z.string().trim().min(2).max(800),
});

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = customerNoteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La note client est invalide." },
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

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id, business_id")
    .eq("id", input.customerId)
    .eq("business_id", input.businessId)
    .is("deleted_at", null)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json(
      { error: "Le client n'a pas pu être vérifié." },
      { status: 500 },
    );
  }
  if (!customer) {
    return NextResponse.json(
      { error: "Le client sélectionné est invalide." },
      { status: 400 },
    );
  }

  const { data: note, error } = await supabaseAdmin
    .from("customer_notes")
    .insert({
      business_id: input.businessId,
      customer_id: input.customerId,
      created_by: owner.profileId,
      note: input.note,
    })
    .select("id, note, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "La note client n'a pas pu être enregistrée." },
      { status: 500 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: input.businessId,
    user_id: owner.profileId,
    action: "customer.note.created",
    table_name: "customer_notes",
    record_id: note.id,
    new_values: {
      customer_id: input.customerId,
      note: input.note,
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
