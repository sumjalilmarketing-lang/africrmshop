import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { employeeInvitationSchema } from "@/lib/validation/employee-invitation";

export async function POST(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const parsed = employeeInvitationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Les informations de l’invitation sont invalides." },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const ownsBusiness =
    owner.ownerships.some(
      (ownership) => ownership.businessId === input.businessId,
    ) ||
    owner.roles.some(
      (role) =>
        role.roleCode === "owner" && role.businessId === input.businessId,
    );
  if (!ownsBusiness) {
    return NextResponse.json(
      { error: "Entreprise non autorisée." },
      { status: 403 },
    );
  }

  const [storeResult, roleResult, existingUser, existingInvitation] =
    await Promise.all([
      supabaseAdmin
        .from("stores")
        .select("id")
        .eq("id", input.storeId)
        .eq("business_id", input.businessId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabaseAdmin
        .from("roles")
        .select("id, code, name")
        .eq("code", input.roleCode)
        .is("business_id", null)
        .maybeSingle(),
      supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", input.email)
        .maybeSingle(),
      supabaseAdmin
        .from("employee_invitations")
        .select("id")
        .eq("business_id", input.businessId)
        .eq("email", input.email)
        .eq("status", "pending")
        .maybeSingle(),
    ]);

  if (!storeResult.data || !roleResult.data) {
    return NextResponse.json(
      { error: "La boutique ou le rôle sélectionné est invalide." },
      { status: 400 },
    );
  }
  if (existingUser.data) {
    return NextResponse.json(
      { error: "Cette adresse e-mail possède déjà un compte AFRICRM." },
      { status: 409 },
    );
  }
  if (existingInvitation.data) {
    return NextResponse.json(
      { error: "Une invitation est déjà en attente pour cette adresse." },
      { status: 409 },
    );
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("employee_invitations")
    .insert({
      business_id: input.businessId,
      store_id: input.storeId,
      role_id: roleResult.data.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      job_title: input.jobTitle || roleResult.data.name,
      token_hash: tokenHash,
      status: "pending",
      invited_by: owner.profileId,
      metadata: { role_code: input.roleCode },
    })
    .select("id")
    .single();
  if (invitationError) {
    return NextResponse.json(
      { error: "L’invitation n’a pas pu être enregistrée." },
      { status: 500 },
    );
  }

  const redirectTo = `${new URL(request.url).origin}/employee/accept?invitation=${encodeURIComponent(token)}`;
  const { error: emailError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo,
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: `${input.firstName} ${input.lastName}`,
        account_type: "employee",
        invitation_id: invitation.id,
      },
    });

  if (emailError) {
    await supabaseAdmin
      .from("employee_invitations")
      .delete()
      .eq("id", invitation.id);
    return NextResponse.json(
      { error: "L’e-mail d’invitation n’a pas pu être envoyé." },
      { status: 502 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: input.businessId,
    user_id: owner.profileId,
    action: "employee.invited",
    table_name: "employee_invitations",
    record_id: invitation.id,
    new_values: {
      email: input.email,
      role_code: input.roleCode,
      store_id: input.storeId,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
