"use client";

import { LoaderCircle, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/landing/logo";
import {
  buildEmployeeInvitationAcceptanceSummary,
  type EmployeeInvitationAcceptanceStep,
} from "@/lib/employee-invitation-acceptance-summary";
import { supabase } from "@/lib/supabaseClient";

export default function AcceptEmployeeInvitationPage() {
  const [step, setStep] =
    useState<EmployeeInvitationAcceptanceStep>("authenticating");
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(
    () => buildEmployeeInvitationAcceptanceSummary({ step, error }),
    [error, step],
  );

  useEffect(() => {
    async function fail(message: string) {
      setError(message);
      setStep("failed");
    }

    async function acceptInvitation() {
      const params = new URLSearchParams(window.location.search);
      const invitationToken = params.get("invitation");
      const code = params.get("code");
      const authResult = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.getSession();
      const session = authResult.data.session;

      if (authResult.error || !session) {
        await fail("Le lien d’authentification est invalide ou expiré.");
        return;
      }

      setStep("accepting");
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
        await fail(result?.error ?? "L’invitation n’a pas pu être acceptée.");
        return;
      }

      setStep("syncing");
      const appSession = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: session.access_token }),
      });
      const sessionData = (await appSession.json().catch(() => null)) as {
        redirectTo?: string;
      } | null;

      if (!appSession.ok || !sessionData?.redirectTo) {
        await fail("Votre session a été créée, mais la redirection a échoué.");
        return;
      }

      setStep("redirecting");
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

        {summary.isError ? (
          <>
            <h1 className="mt-8 text-2xl font-bold text-red-700">
              {summary.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-red-600">
              {summary.description}
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-[#e9f5ee] text-[#0b7a4b]">
              <UserCheck className="size-6" />
            </span>
            <LoaderCircle className="mx-auto mt-6 size-6 animate-spin text-[#0b7a4b]" />
            <h1 className="mt-4 text-2xl font-bold">{summary.title}</h1>
            <p className="text-muted mt-3 text-sm">{summary.description}</p>
          </>
        )}

        <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#edf2ef]">
          <div
            className="h-full rounded-full bg-[#0b7a4b] transition-all duration-500"
            style={{ width: `${summary.progress}%` }}
          />
        </div>
      </section>
    </main>
  );
}
