import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getAppSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sécuriser mon compte",
  description: "Définissez votre mot de passe AFRICRM Shop.",
};

export default async function ChangePasswordPage() {
  const appSession = await getAppSession();

  if (!appSession) {
    redirect("/connexion");
  }

  if (!appSession.mustChangePassword) {
    redirect(appSession.defaultRoute);
  }

  return <ChangePasswordForm email={appSession.email} />;
}
