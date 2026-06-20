import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getAppSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Créer mon compte",
  description: "Créez votre compte propriétaire AFRICRM Shop.",
};

export default async function RegisterPage() {
  const session = await getAppSession();
  if (session) redirect(session.defaultRoute);
  return <RegisterForm />;
}
