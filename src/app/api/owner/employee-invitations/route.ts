import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { employeeInvitationSchema } from "@/lib/validation/employee-invitation";

type CreatedInvitation = {
  invitation_id: string;
  role_name: string;
  invitation_expires_at: string;
};

const invitationErrors: Record<string, { status: number; message: string }> = {
  BUSINESS_NOT_AVAILABLE: {
    status: 400,
    message: "Cette entreprise n’est pas disponible.",
  },
  OWNER_ACCESS_DENIED: { status: 403, message: "Entreprise non autorisée." },
  STORE_NOT_AVAILABLE: {
    status: 400,
    message: "La boutique sélectionnée est invalide.",
  },
  ROLE_NOT_AVAILABLE: {
    status: 400,
    message: "Le rôle sélectionné est invalide.",
  },
  ROLE_NOT_ALLOWED_FOR_ACTIVITY: {
    status: 400,
    message: "Ce rôle ne correspond pas à l’activité de l’entreprise.",
  },
  USER_ALREADY_EXISTS: {
    status: 409,
    message: "Cette adresse e-mail possède déjà un compte AFRICRM.",
  },
  INVITATION_ALREADY_PENDING: {
    status: 409,
    message: "Une invitation est déjà en attente pour cette adresse.",
  },
  EMPLOYEE_LIMIT_REACHED: {
    status: 409,
    message: "La limite d’employés de votre offre est atteinte.",
  },
  SUBSCRIPTION_NOT_AVAILABLE: {
    status: 409,
    message: "Aucun abonnement actif ne permet cette invitation.",
  },
};

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
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabaseAdmin.rpc(
    "africrm_create_employee_invitation",
    {
      p_business_id: input.businessId,
      p_store_id: input.storeId,
      p_role_code: input.roleCode,
      p_email: input.email,
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_job_title: input.jobTitle,
      p_token_hash: tokenHash,
      p_invited_by: owner.profileId,
    },
  );

  if (error) {
    console.error(
      "Création transactionnelle de l’invitation interrompue",
      error,
    );
    const knownError = invitationErrors[error.message];
    return NextResponse.json(
      {
        error:
          knownError?.message ?? "L’invitation n’a pas pu être enregistrée.",
      },
      { status: knownError?.status ?? 500 },
    );
  }

  const invitation = (data as CreatedInvitation[] | null)?.[0];
  if (!invitation) {
    return NextResponse.json(
      { error: "L’invitation n’a retourné aucun résultat." },
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
        invitation_id: invitation.invitation_id,
      },
    });

  if (emailError) {
    await supabaseAdmin
      .from("employee_invitations")
      .delete()
      .eq("id", invitation.invitation_id);
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
    record_id: invitation.invitation_id,
    new_values: {
      email: input.email,
      role_code: input.roleCode,
      store_id: input.storeId,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    invitationId?: unknown;
  } | null;
  const invitationId = z.uuid().safeParse(body?.invitationId);
  if (!invitationId.success) {
    return NextResponse.json(
      { error: "Invitation invalide." },
      { status: 400 },
    );
  }

  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("employee_invitations")
    .select("id, business_id, status")
    .eq("id", invitationId.data)
    .maybeSingle();
  if (invitationError || !invitation) {
    return NextResponse.json(
      { error: "Invitation introuvable." },
      { status: 404 },
    );
  }

  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === invitation.business_id,
  );
  if (!ownsBusiness) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Cette invitation n’est plus révocable." },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("employee_invitations")
    .update({ status: "revoked" })
    .eq("id", invitation.id)
    .eq("status", "pending");
  if (updateError) {
    return NextResponse.json(
      { error: "L’invitation n’a pas pu être révoquée." },
      { status: 500 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: invitation.business_id,
    user_id: owner.profileId,
    action: "employee.invitation.revoked",
    table_name: "employee_invitations",
    record_id: invitation.id,
  });
  return NextResponse.json({ success: true });
}
