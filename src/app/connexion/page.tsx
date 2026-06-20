import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAppSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace AFRICRM Shop.",
};

export default async function LoginPage() {
  const appSession = await getAppSession();

  if (appSession) {
    redirect(appSession.defaultRoute);
  }

  return <LoginForm />;
}
