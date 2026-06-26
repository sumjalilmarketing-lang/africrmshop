import { redirect } from "next/navigation";
import { OwnerShell } from "@/components/owner/owner-shell";
import { getAppSession } from "@/lib/auth";

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAppSession();
  if (!session) redirect("/connexion");
  if (session.mustChangePassword) redirect("/changer-mot-de-passe");
  if (!session.isOwner) redirect(session.defaultRoute);

  return <OwnerShell user={session}>{children}</OwnerShell>;
}
