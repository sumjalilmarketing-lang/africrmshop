import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const acceptanceErrors: Record<string, { status: number; message: string }> = {
  INVITATION_NOT_FOUND: {
    status: 404,
    message: "Cette invitation est introuvable.",
  },
  INVITATION_NOT_PENDING: {
    status: 409,
    message: "Cette invitation n’est plus disponible.",
  },
  INVITATION_EXPIRED: {
    status: 410,
    message: "Cette invitation a expiré.",
  },
  INVITATION_EMAIL_MISMATCH: {
    status: 403,
    message: "Cette invitation appartient à une autre adresse e-mail.",
  },
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    accessToken?: unknown;
    invitationToken?: unknown;
  } | null;
  if (typeof body?.accessToken !== "string") {
    return NextResponse.json(
      { error: "Invitation invalide." },
      { status: 400 },
    );
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabaseAdmin.auth.getUser(body.accessToken);
  if (authError || !authUser?.email) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const invitationToken =
    typeof body.invitationToken === "string" ? body.invitationToken : null;
  const tokenHash = invitationToken
    ? createHash("sha256").update(invitationToken).digest("hex")
    : await resolvePendingInvitationTokenHash(authUser.email);

  if (!tokenHash) {
    return NextResponse.json(
      { error: "Aucune invitation en attente ne correspond à cette adresse." },
      { status: 404 },
    );
  }

  const { error } = await supabaseAdmin.rpc(
    "africrm_accept_employee_invitation",
    {
      p_auth_user_id: authUser.id,
      p_email: authUser.email,
      p_token_hash: tokenHash,
    },
  );

  if (error) {
    if (error.message.includes("gen_random_bytes")) {
      const fallback = await acceptInvitationWithAdminFallback({
        authUserId: authUser.id,
        email: authUser.email,
        tokenHash,
      });

      if (!fallback.error) {
        return NextResponse.json({ success: true });
      }

      const knownFallbackError = acceptanceErrors[fallback.error];
      return NextResponse.json(
        {
          error:
            knownFallbackError?.message ??
            "L’invitation n’a pas pu être finalisée.",
        },
        { status: knownFallbackError?.status ?? 500 },
      );
    }

    console.error(
      "Acceptation transactionnelle de l’invitation interrompue",
      error,
    );
    const knownError = acceptanceErrors[error.message];
    return NextResponse.json(
      {
        error: knownError?.message ?? "L’invitation n’a pas pu être finalisée.",
      },
      { status: knownError?.status ?? 500 },
    );
  }

  return NextResponse.json({ success: true });
}

async function acceptInvitationWithAdminFallback({
  authUserId,
  email,
  tokenHash,
}: {
  authUserId: string;
  email: string;
  tokenHash: string;
}) {
  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("employee_invitations")
    .select(
      "id, business_id, store_id, role_id, email, first_name, last_name, job_title, invited_by, status, expires_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (invitationError || !invitation) return { error: "INVITATION_NOT_FOUND" };
  if (invitation.status !== "pending") {
    return { error: "INVITATION_NOT_PENDING" };
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    return { error: "INVITATION_EXPIRED" };
  }
  if (invitation.email.toLowerCase() !== email.trim().toLowerCase()) {
    return { error: "INVITATION_EMAIL_MISMATCH" };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select(
      "id, business_id, first_name, last_name, display_name, email, metadata",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profileError) return { error: "PROFILE_LOOKUP_FAILED" };

  const metadata = {
    ...((profile?.metadata ?? {}) as Record<string, unknown>),
    account_type: "employee",
    invitation_id: invitation.id,
    must_change_password: false,
  };
  const displayName =
    [invitation.first_name, invitation.last_name].filter(Boolean).join(" ") ||
    profile?.display_name ||
    email;

  let profileId = profile?.id as string | undefined;
  if (!profileId) {
    const { data: createdProfile, error: createProfileError } =
      await supabaseAdmin
        .from("users")
        .insert({
          auth_user_id: authUserId,
          business_id: invitation.business_id,
          first_name: invitation.first_name ?? "Employé",
          last_name: invitation.last_name ?? "AFRICRM",
          display_name: displayName,
          email: email.trim().toLowerCase(),
          status: "active",
          metadata,
        })
        .select("id")
        .single();

    if (createProfileError || !createdProfile) {
      return { error: "PROFILE_CREATE_FAILED" };
    }
    profileId = createdProfile.id;
  } else {
    const existingProfile = profile!;
    const { error: updateProfileError } = await supabaseAdmin
      .from("users")
      .update({
        business_id: existingProfile.business_id ?? invitation.business_id,
        first_name:
          invitation.first_name ?? existingProfile.first_name ?? "Employé",
        last_name:
          invitation.last_name ?? existingProfile.last_name ?? "AFRICRM",
        display_name: displayName,
        email: email.trim().toLowerCase(),
        status: "active",
        metadata,
      })
      .eq("id", profileId);

    if (updateProfileError) return { error: "PROFILE_UPDATE_FAILED" };
  }

  const { data: existingEmployee, error: employeeLookupError } =
    await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("business_id", invitation.business_id)
      .eq("user_id", profileId)
      .is("deleted_at", null)
      .maybeSingle();

  if (employeeLookupError) return { error: "EMPLOYEE_LOOKUP_FAILED" };

  let employeeId = existingEmployee?.id as string | undefined;
  if (!employeeId) {
    const employeeNumber = `EMP-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const { data: createdEmployee, error: createEmployeeError } =
      await supabaseAdmin
        .from("employees")
        .insert({
          business_id: invitation.business_id,
          store_id: invitation.store_id,
          user_id: profileId,
          employee_number: employeeNumber,
          first_name: invitation.first_name ?? "Employé",
          last_name: invitation.last_name ?? "AFRICRM",
          email: email.trim().toLowerCase(),
          job_title: invitation.job_title,
          is_active: true,
          metadata: { invitation_id: invitation.id },
        })
        .select("id")
        .single();

    if (createEmployeeError || !createdEmployee) {
      return { error: "EMPLOYEE_CREATE_FAILED" };
    }
    employeeId = createdEmployee.id;
  }

  const { data: existingRole, error: roleLookupError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", profileId)
    .eq("role_id", invitation.role_id)
    .eq("business_id", invitation.business_id)
    .eq("store_id", invitation.store_id)
    .maybeSingle();

  if (roleLookupError) return { error: "ROLE_LOOKUP_FAILED" };

  if (!existingRole) {
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: profileId,
        role_id: invitation.role_id,
        business_id: invitation.business_id,
        store_id: invitation.store_id,
        assigned_by: invitation.invited_by,
      });

    if (roleInsertError) return { error: "ROLE_ASSIGN_FAILED" };
  }

  const { error: invitationUpdateError } = await supabaseAdmin
    .from("employee_invitations")
    .update({
      status: "accepted",
      accepted_by_user_id: profileId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)
    .eq("status", "pending");

  if (invitationUpdateError) return { error: "INVITATION_NOT_PENDING" };

  await supabaseAdmin.from("audit_logs").insert({
    business_id: invitation.business_id,
    user_id: profileId,
    action: "employee.invitation.accepted",
    table_name: "employee_invitations",
    record_id: invitation.id,
    new_values: {
      store_id: invitation.store_id,
      role_id: invitation.role_id,
      employee_id: employeeId,
      fallback: true,
    },
  });

  return { error: null };
}

async function resolvePendingInvitationTokenHash(email: string) {
  const { data, error } = await supabaseAdmin
    .from("employee_invitations")
    .select("token_hash")
    .eq("status", "pending")
    .ilike("email", email)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Recherche d’invitation employé interrompue", error);
    return null;
  }

  return data?.token_hash ?? null;
}
