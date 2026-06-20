import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    accessToken?: unknown;
  } | null;

  if (typeof body?.accessToken !== "string") {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  }

  const {
    data: { user: authUser },
    error: authError,
  } = await supabaseAdmin.auth.getUser(body.accessToken);

  if (authError || !authUser?.email) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const authMetadata = authUser.user_metadata as Record<string, unknown>;
  const firstName =
    typeof authMetadata.first_name === "string"
      ? authMetadata.first_name.trim()
      : "";
  const lastName =
    typeof authMetadata.last_name === "string"
      ? authMetadata.last_name.trim()
      : "";

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "Le profil d’inscription est incomplet." },
      { status: 400 },
    );
  }

  const { data: existingProfile, error: existingError } = await supabaseAdmin
    .from("users")
    .select("metadata")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "Le profil n’a pas pu être vérifié." },
      { status: 500 },
    );
  }

  const metadata = {
    ...((existingProfile?.metadata as Record<string, unknown> | null) ?? {}),
    account_type: "owner",
    onboarding_started_at: new Date().toISOString(),
    must_change_password: false,
  };
  const { error: profileError } = await supabaseAdmin.from("users").upsert(
    {
      auth_user_id: authUser.id,
      first_name: firstName,
      last_name: lastName,
      display_name: `${firstName} ${lastName}`,
      email: authUser.email.toLowerCase(),
      status: "active",
      metadata,
    },
    { onConflict: "auth_user_id" },
  );

  if (profileError) {
    return NextResponse.json(
      { error: "Le profil Owner n’a pas pu être créé." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
