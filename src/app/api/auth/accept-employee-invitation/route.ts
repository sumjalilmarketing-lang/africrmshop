import { createHash } from "node:crypto";
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
  const { error } = await supabaseAdmin.rpc(
    "africrm_accept_employee_invitation",
    {
      p_auth_user_id: authUser.id,
      p_email: authUser.email,
      p_token_hash: tokenHash,
    },
  );

  if (error) {
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
