import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    accessToken?: unknown;
    invitationToken?: unknown;
  } | null;
  if (
    typeof body?.accessToken !== "string" ||
    typeof body.invitationToken !== "string"
  ) {
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

  const tokenHash = createHash("sha256")
    .update(body.invitationToken)
    .digest("hex");
  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from("employee_invitations")
    .select(
      "id, business_id, store_id, role_id, email, first_name, last_name, job_title, status, expires_at, metadata",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (invitationError || !invitation) {
    return NextResponse.json(
      { error: "Cette invitation est introuvable." },
      { status: 404 },
    );
  }
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Cette invitation n’est plus disponible." },
      { status: 409 },
    );
  }
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await supabaseAdmin
      .from("employee_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return NextResponse.json(
      { error: "Cette invitation a expiré." },
      { status: 410 },
    );
  }
  if (authUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Cette invitation appartient à une autre adresse e-mail." },
      { status: 403 },
    );
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("users")
    .select("id, metadata")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  const metadata = {
    ...((existingProfile?.metadata as Record<string, unknown> | null) ?? {}),
    account_type: "employee",
    invitation_id: invitation.id,
    must_change_password: false,
  };
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        auth_user_id: authUser.id,
        business_id: invitation.business_id,
        first_name: invitation.first_name ?? "Employé",
        last_name: invitation.last_name ?? "AFRICRM",
        display_name:
          [invitation.first_name, invitation.last_name]
            .filter(Boolean)
            .join(" ") || authUser.email,
        email: authUser.email.toLowerCase(),
        status: "active",
        metadata,
      },
      { onConflict: "auth_user_id" },
    )
    .select("id")
    .single();
  if (profileError) {
    return NextResponse.json(
      { error: "Le profil employé n’a pas pu être créé." },
      { status: 500 },
    );
  }

  const { data: existingEmployee } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("business_id", invitation.business_id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!existingEmployee) {
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        business_id: invitation.business_id,
        store_id: invitation.store_id,
        user_id: profile.id,
        employee_number: `EMP-${randomBytes(4).toString("hex").toUpperCase()}`,
        first_name: invitation.first_name ?? "Employé",
        last_name: invitation.last_name ?? "AFRICRM",
        email: authUser.email.toLowerCase(),
        job_title: invitation.job_title,
        is_active: true,
        metadata: { invitation_id: invitation.id },
      });
    if (employeeError) {
      return NextResponse.json(
        { error: "La fiche employé n’a pas pu être créée." },
        { status: 500 },
      );
    }
  }

  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", profile.id)
    .eq("role_id", invitation.role_id)
    .eq("business_id", invitation.business_id)
    .eq("store_id", invitation.store_id)
    .maybeSingle();
  if (!existingRole) {
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: profile.id,
      role_id: invitation.role_id,
      business_id: invitation.business_id,
      store_id: invitation.store_id,
      assigned_by: null,
    });
    if (roleError) {
      return NextResponse.json(
        { error: "Le rôle employé n’a pas pu être attribué." },
        { status: 500 },
      );
    }
  }

  const { error: acceptanceError } = await supabaseAdmin
    .from("employee_invitations")
    .update({
      status: "accepted",
      accepted_by_user_id: profile.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)
    .eq("status", "pending");
  if (acceptanceError) {
    return NextResponse.json(
      { error: "L’invitation n’a pas pu être finalisée." },
      { status: 500 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    business_id: invitation.business_id,
    user_id: profile.id,
    action: "employee.invitation.accepted",
    table_name: "employee_invitations",
    record_id: invitation.id,
    new_values: { store_id: invitation.store_id, role_id: invitation.role_id },
  });

  return NextResponse.json({ success: true });
}
