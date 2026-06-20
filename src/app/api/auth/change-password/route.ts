import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAppSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export async function POST(request: Request) {
  const appSession = await getAppSession();

  if (!appSession) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
  } | null;
  const password = body?.password;

  if (typeof password !== "string" || !passwordRule.test(password)) {
    return NextResponse.json(
      {
        error:
          "Utilisez au moins 12 caractères avec une majuscule, une minuscule, un chiffre et un symbole.",
      },
      { status: 400 },
    );
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    appSession.authUserId,
    { password },
  );

  if (authError) {
    return NextResponse.json(
      { error: "Le mot de passe n’a pas pu être modifié." },
      { status: 500 },
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("metadata")
    .eq("id", appSession.profileId)
    .single();

  if (profileError) {
    return NextResponse.json(
      { error: "Le profil n’a pas pu être mis à jour." },
      { status: 500 },
    );
  }

  const metadata = {
    ...((profile.metadata as Record<string, unknown> | null) ?? {}),
    must_change_password: false,
    password_changed_at: new Date().toISOString(),
  };
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ metadata })
    .eq("id", appSession.profileId);

  if (updateError) {
    return NextResponse.json(
      { error: "Le profil n’a pas pu être finalisé." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
