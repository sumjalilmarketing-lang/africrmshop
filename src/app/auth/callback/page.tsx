"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeRegistration() {
      const code = new URLSearchParams(window.location.search).get("code");
      const sessionResult = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.getSession();
      const session = sessionResult.data.session;

      if (sessionResult.error || !session) {
        setError("Le lien de confirmation est invalide ou expiré.");
        return;
      }

      const profileResponse = await fetch("/api/auth/owner-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.access_token }),
      });

      if (!profileResponse.ok) {
        const result = (await profileResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(result?.error ?? "Le profil Owner n’a pas pu être créé.");
        return;
      }

      const appSessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const appSession = (await appSessionResponse
        .json()
        .catch(() => null)) as {
        redirectTo?: string;
        error?: string;
      } | null;

      if (!appSessionResponse.ok || !appSession?.redirectTo) {
        setError(
          appSession?.error ?? "La session AFRICRM n’a pas pu être créée.",
        );
        return;
      }

      window.location.replace(appSession.redirectTo);
    }

    void completeRegistration();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-6">
      <section className="w-full max-w-md rounded-3xl border border-[#e2e8e4] bg-white p-8 text-center shadow-xl shadow-[#0a3827]/5">
        <div className="flex justify-center">
          <Logo />
        </div>
        {error ? (
          <>
            <h1 className="mt-8 text-2xl font-bold text-red-700">
              Confirmation impossible
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-600">{error}</p>
            <a
              href="/inscription"
              className="text-brand mt-6 inline-flex text-sm font-bold"
            >
              Recommencer l’inscription
            </a>
          </>
        ) : (
          <>
            <LoaderCircle className="text-brand mx-auto mt-8 size-8 animate-spin" />
            <h1 className="mt-5 text-2xl font-bold">
              Création de votre espace
            </h1>
            <p className="text-muted mt-3 text-sm">
              Nous sécurisons votre profil propriétaire…
            </p>
            <div className="text-muted mt-6 flex items-center justify-center gap-2 text-xs">
              <ShieldCheck className="text-brand size-4" /> Vérification
              Supabase
            </div>
          </>
        )}
      </section>
    </main>
  );
}
