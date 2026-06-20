import { NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createBusinessSlug } from "@/lib/validation/business";
import { ownerBusinessSchema } from "@/lib/validation/owner-business";

type CreatedBusiness = {
  business_id: string;
  store_id: string;
  business_slug: string;
  trial_ends_at: string;
};

const invalidReferenceErrors = new Set([
  "ACTIVITY_TYPE_NOT_FOUND",
  "SUBSCRIPTION_PLAN_NOT_FOUND",
]);

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = ownerBusinessSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations de l’entreprise sont invalides." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabaseAdmin.rpc(
    "africrm_create_owner_business",
    {
      p_owner_user_id: owner.profileId,
      p_name: input.name,
      p_legal_name: input.legalName,
      p_slug_base: createBusinessSlug(input.name),
      p_activity_type_code: input.activityTypeCode,
      p_plan_code: input.planCode,
      p_phone: input.phone,
      p_store_name: input.storeName,
      p_store_code: input.storeCode,
      p_city: input.city,
    },
  );

  if (error) {
    console.error("Onboarding Owner transactionnel interrompu", error);

    if (invalidReferenceErrors.has(error.message)) {
      return NextResponse.json(
        { error: "Le type d’activité ou l’offre sélectionnée est invalide." },
        { status: 400 },
      );
    }

    if (error.message === "OWNER_PROFILE_NOT_FOUND") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    return NextResponse.json(
      { error: "La création de l’entreprise a échoué." },
      { status: 500 },
    );
  }

  const createdBusiness = (data as CreatedBusiness[] | null)?.[0];
  if (!createdBusiness) {
    return NextResponse.json(
      { error: "La création de l’entreprise n’a retourné aucun résultat." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      business: {
        id: createdBusiness.business_id,
        slug: createdBusiness.business_slug,
      },
      redirectTo: "/owner/dashboard",
    },
    { status: 201 },
  );
}
