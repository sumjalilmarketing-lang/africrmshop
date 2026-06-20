import { redirect } from "next/navigation";
import { OwnerShell } from "@/components/owner/owner-shell";
import { getOwnerSession } from "@/lib/auth";

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  return (
    <OwnerShell user={{ displayName: owner.displayName, email: owner.email }}>
      {children}
    </OwnerShell>
  );
}
