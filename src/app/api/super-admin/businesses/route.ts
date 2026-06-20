import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSuperAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createBusinessSchema,
  createBusinessSlug,
} from "@/lib/validation/business";

export async function POST(request: Request) {
  const superAdmin = await getSuperAdminSession();

  if (!superAdmin || superAdmin.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = createBusinessSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations fournies sont invalides." },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const slugBase = createBusinessSlug(input.name);

  const [activityResult, planResult] = await Promise.all([
    supabaseAdmin
      .from("activity_types")
      .select("id, code")
      .eq("code", input.activityTypeCode)
      .eq("is_active", true)
      .maybeSingle(),
    supabaseAdmin
      .from("subscription_plans")
      .select("id, code, name")
      .eq("code", input.plan)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!activityResult.data || !planResult.data) {
    return NextResponse.json(
      { error: "Le type d’activité ou l’offre sélectionnée est invalide." },
      { status: 400 },
    );
  }

  if (!slugBase) {
    return NextResponse.json(
      {
        error: "Le nom de l’entreprise ne permet pas de créer un identifiant.",
      },
      { status: 400 },
    );
  }

  const { data: duplicateEmail } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", input.ownerEmail)
    .maybeSingle();

  if (duplicateEmail) {
    return NextResponse.json(
      { error: "Cette adresse e-mail est déjà associée à un utilisateur." },
      { status: 409 },
    );
  }

  const { data: duplicateSlug } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("slug", slugBase)
    .maybeSingle();
  const slug = duplicateSlug
    ? `${slugBase}-${randomBytes(3).toString("hex")}`
    : slugBase;
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const temporaryPassword = `Af!${randomBytes(15).toString("base64url")}9z`;

  let businessId: string | null = null;
  let storeId: string | null = null;
  let authUserId: string | null = null;
  let profileId: string | null = null;
  let ownershipId: string | null = null;
  let subscriptionId: string | null = null;
  let stage = "entreprise";

  try {
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: input.name,
        legal_name: input.legalName || null,
        slug,
        email: input.ownerEmail,
        phone: input.phone || null,
        activity_type_id: activityResult.data.id,
        onboarding_status: "store_created",
        status: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        metadata: {
          sector: input.sector,
          activity_type: activityResult.data.code,
          subscription_plan: planResult.data.name,
        },
      })
      .select("id")
      .single();

    if (businessError) throw businessError;
    businessId = business.id;

    stage = "paramètres";
    const { error: settingsError } = await supabaseAdmin
      .from("business_settings")
      .insert({ business_id: businessId, settings: {} });
    if (settingsError) throw settingsError;

    stage = "siège";
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .insert({
        business_id: businessId,
        name: `${input.name} - Siège`,
        code: "HQ",
        email: input.ownerEmail,
        phone: input.phone || null,
        city: "Dakar",
        is_headquarters: true,
        status: "active",
      })
      .select("id")
      .single();
    if (storeError) throw storeError;
    storeId = store.id;

    stage = "compte propriétaire";
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: input.ownerEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          display_name: `${input.ownerFirstName} ${input.ownerLastName}`,
        },
      });
    if (authError) throw authError;
    authUserId = authData.user.id;

    stage = "profil propriétaire";
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          auth_user_id: authUserId,
          business_id: businessId,
          first_name: input.ownerFirstName,
          last_name: input.ownerLastName,
          display_name: `${input.ownerFirstName} ${input.ownerLastName}`,
          email: input.ownerEmail,
          phone: input.phone || null,
          status: "active",
          metadata: {
            account_type: "business_owner",
            must_change_password: true,
          },
        },
        { onConflict: "auth_user_id" },
      )
      .select("id")
      .single();
    if (profileError) throw profileError;
    profileId = profile.id;

    stage = "propriété de l’entreprise";
    const { data: ownership, error: ownershipError } = await supabaseAdmin
      .from("business_owners")
      .insert({
        business_id: businessId,
        user_id: profileId,
        status: "active",
        is_primary: true,
        invited_by: superAdmin.profileId,
        accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ownershipError) throw ownershipError;
    ownershipId = ownership.id;

    stage = "rôle propriétaire";
    const { data: ownerRole, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("code", "owner")
      .single();
    if (roleError) throw roleError;

    stage = "attribution du rôle";
    const { error: assignmentError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: profileId,
        role_id: ownerRole.id,
        business_id: businessId,
        store_id: null,
        assigned_by: superAdmin.profileId,
      });
    if (assignmentError) throw assignmentError;

    stage = "abonnement";
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("business_subscriptions")
      .insert({
        business_id: businessId,
        plan_id: planResult.data.id,
        status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndsAt.toISOString(),
        metadata: { source: "super_admin" },
      })
      .select("id")
      .single();
    if (subscriptionError) throw subscriptionError;
    subscriptionId = subscription.id;

    stage = "journal d’audit";
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        business_id: businessId,
        user_id: superAdmin.profileId,
        action: "business.created",
        table_name: "businesses",
        record_id: businessId,
        new_values: {
          name: input.name,
          slug,
          owner_email: input.ownerEmail,
          plan: planResult.data.code,
          activity_type: activityResult.data.code,
        },
      });
    if (auditError) throw auditError;

    return NextResponse.json(
      {
        business: { id: businessId, name: input.name, slug },
        owner: {
          email: input.ownerEmail,
          temporaryPassword,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (subscriptionId) {
      await supabaseAdmin
        .from("business_subscriptions")
        .delete()
        .eq("id", subscriptionId);
    }
    if (ownershipId) {
      await supabaseAdmin
        .from("business_owners")
        .delete()
        .eq("id", ownershipId);
    }
    if (profileId) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", profileId);
      await supabaseAdmin.from("users").delete().eq("id", profileId);
    }
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }
    if (storeId) {
      await supabaseAdmin.from("stores").delete().eq("id", storeId);
    }
    if (businessId) {
      await supabaseAdmin
        .from("business_settings")
        .delete()
        .eq("business_id", businessId);
      await supabaseAdmin.from("businesses").delete().eq("id", businessId);
    }

    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : "Erreur inconnue";
    console.error(`Création d’entreprise interrompue (${stage})`, error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "La création de l’entreprise a échoué."
            : `Création impossible à l’étape « ${stage} » : ${message}`,
      },
      { status: 500 },
    );
  }
}
