import {
  ArrowLeft,
  Crown,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth";
import { buildSuperAdminOwnersSummary } from "@/lib/super-admin-owners-summary";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cn } from "@/lib/utils";

function getOwnerStatusClass(status: string, isPrimary: boolean) {
  if (isPrimary) return "bg-amber-50 text-amber-700";
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "suspended") return "bg-red-50 text-red-700";

  return "bg-slate-100 text-slate-700";
}

export default async function SuperAdminOwnersPage() {
  const admin = await getSuperAdminSession();
  if (!admin) redirect("/connexion");
  if (admin.mustChangePassword) redirect("/changer-mot-de-passe");

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
  const ownersSummary = buildSuperAdminOwnersSummary(
    (owners.data ?? []).map((owner) => ({
      status: owner.status,
      isPrimary: owner.is_primary,
      userStatus: userMap.get(owner.user_id)?.status ?? null,
      businessExists: businessMap.has(owner.business_id),
    })),
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

        <p className="mt-6 text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 44
        </p>
        <h1 className="mt-3 text-3xl font-bold">Propriétaires</h1>
        <p className="text-muted mt-2 text-sm">
          Tous les propriétaires, leurs entreprises et la qualité des liens
          d’accès.
        </p>

        <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Affectations
              </p>
              <Crown className="size-4 text-amber-700" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {ownersSummary.ownerAssignmentCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              {ownersSummary.primaryOwnerCount} propriétaire(s) principal(aux)
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Actifs
              </p>
              <ShieldCheck className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black text-[#0b7a4b]">
              {ownersSummary.activeOwnerCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              score couverture {ownersSummary.coverageScore}%
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Inactifs
              </p>
              <TriangleAlert className="size-4 text-amber-600" />
            </div>
            <p className="mt-3 text-2xl font-black text-amber-700">
              {ownersSummary.inactiveOwnerCount}
            </p>
            <p className="text-muted mt-1 text-xs">à vérifier côté support</p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Anomalies
              </p>
              <TriangleAlert className="size-4 text-red-600" />
            </div>
            <p className="mt-3 text-2xl font-black text-red-700">
              {ownersSummary.missingProfileCount +
                ownersSummary.orphanBusinessLinkCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              profils ou entreprises introuvables
            </p>
          </article>
        </section>

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
                      <Mail className="size-3" />{" "}
                      {user?.email ?? "Email non disponible"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold">
                  {business?.name ?? "Entreprise supprimée"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold",
                    getOwnerStatusClass(owner.status, owner.is_primary),
                  )}
                >
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
