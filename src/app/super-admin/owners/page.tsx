import { ArrowLeft, Crown, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function SuperAdminOwnersPage() {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/connexion");
  const [owners, users, businesses] = await Promise.all([
    supabaseAdmin
      .from("business_owners")
      .select("id, business_id, user_id, status, is_primary, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("users")
      .select("id, display_name, email, status")
      .is("deleted_at", null),
    supabaseAdmin.from("businesses").select("id, name").is("deleted_at", null),
  ]);
  if (owners.error || users.error || businesses.error) {
    throw new Error(
      owners.error?.message ??
        users.error?.message ??
        businesses.error?.message,
    );
  }
  const userMap = new Map((users.data ?? []).map((user) => [user.id, user]));
  const businessMap = new Map(
    (businesses.data ?? []).map((business) => [business.id, business]),
  );

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/super-admin"
          className="text-muted flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Propriétaires</h1>
        <p className="text-muted mt-2 text-sm">
          Tous les propriétaires et leurs entreprises.
        </p>
        <div className="mt-7 overflow-hidden rounded-2xl border border-[#e1e7e3] bg-white">
          {(owners.data ?? []).map((owner) => {
            const user = userMap.get(owner.user_id);
            const business = businessMap.get(owner.business_id);
            return (
              <div
                key={owner.id}
                className="grid gap-4 border-b border-[#edf0ee] px-5 py-4 last:border-0 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
                    <Crown className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">
                      {user?.display_name ?? "Profil inconnu"}
                    </p>
                    <p className="text-muted mt-1 flex items-center gap-1 text-[10px]">
                      <Mail className="size-3" /> {user?.email}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold">
                  {business?.name ?? "Entreprise supprimée"}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                  {owner.is_primary ? "Principal" : owner.status}
                </span>
              </div>
            );
          })}
          {(owners.data ?? []).length === 0 && (
            <p className="text-muted px-6 py-12 text-center text-sm">
              Aucun propriétaire lié pour le moment.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
