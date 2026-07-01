import { redirect } from "next/navigation";
import { OwnerNotificationsClient } from "@/components/owner/owner-notifications-client";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerNotificationsData } from "@/lib/owner-notifications-data";

export default async function OwnerNotificationsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const { businesses, stores, notifications } =
    await getOwnerNotificationsData(owner);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 29
        </p>
        <h1 className="mt-3 text-3xl font-black">Notifications</h1>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          Regroupez les événements importants à traiter : contrôles sensibles,
          dépenses à valider et échéances à surveiller.
        </p>
      </div>

      <OwnerNotificationsClient
        businesses={businesses}
        stores={stores}
        notifications={notifications}
      />
    </div>
  );
}
