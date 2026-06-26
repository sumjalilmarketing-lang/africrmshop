"use client";

import { LoaderCircle, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/lib/supabaseClient";

export default function AcceptEmployeeInvitationPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function acceptInvitation() {
      const params = new URLSearchParams(window.location.search);
      const invitationToken = params.get("invitation");
      const code = params.get("code");
      const authResult = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.getSession();
      const session = authResult.data.session;
      if (authResult.error || !session) {
        setError("Le lien d’authentification est invalide ou expiré.");
        return;
      }
      const acceptance = await fetch("/api/auth/accept-employee-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: session.access_token,
          ...(invitationToken ? { invitationToken } : {}),
        }),
      });
      const result = (await acceptance.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!acceptance.ok) {
        setError(result?.error ?? "L’invitation n’a pas pu être acceptée.");
        return;
      }
      const appSession = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const sessionData = (await appSession.json()) as { redirectTo: string };
      window.location.replace(sessionData.redirectTo);
    }

    void acceptInvitation();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-6">
      <section className="w-full max-w-md rounded-3xl border border-[#e1e7e3] bg-white p-8 text-center shadow-xl shadow-[#0a3827]/5">
        <div className="flex justify-center">
          <Logo />
        </div>
        {error ? (
          <>
            <h1 className="mt-8 text-2xl font-bold text-red-700">
              Invitation impossible
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-600">{error}</p>
          </>
        ) : (
          <>
            <span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
              <UserCheck className="size-6" />
            </span>
            <LoaderCircle className="mx-auto mt-6 size-6 animate-spin text-[#0b7a4b]" />
            <h1 className="mt-4 text-2xl font-bold">
              Préparation de votre accès
            </h1>
            <p className="text-muted mt-3 text-sm">
              Nous configurons votre rôle et votre boutique…
            </p>
          </>
        )}
      </section>
    </main>
  );
}
