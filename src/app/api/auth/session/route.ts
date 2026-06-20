import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAppSessionFromAccessToken } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    accessToken?: unknown;
  } | null;
  const accessToken = body?.accessToken;

  if (typeof accessToken !== "string" || accessToken.length < 20) {
    return NextResponse.json(
      { error: "Jeton de session invalide." },
      { status: 400 },
    );
  }

  const session = await getAppSessionFromAccessToken(accessToken);

  if (!session) {
    return NextResponse.json(
      { error: "Ce compte n’est pas encore autorisé dans AFRICRM Shop." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    user: session,
    redirectTo: session.defaultRoute,
  });
  response.cookies.set(AUTH_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });

  return response;
}

export async function DELETE() {
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
