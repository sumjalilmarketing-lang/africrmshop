import {
  BadgeCheck,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Store,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import { buildEmployeeDashboardSummary } from "@/lib/employee-dashboard-summary";

export default async function EmployeeDashboardPage() {
  const employee = await getAppSession();
  if (!employee) redirect("/connexion");
  if (employee.mustChangePassword) redirect("/changer-mot-de-passe");
  if (!employee.isEmployee) redirect(employee.defaultRoute);

  const dashboardSummary = buildEmployeeDashboardSummary({
    roles: employee.roles,
    permissions: employee.permissions,
    permissionScopes: employee.permissionScopes,
  });

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
          POS 48
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          Bonjour, {employee.displayName}
        </h1>
        <p className="text-muted mt-2 text-sm">
          Vos outils et votre périmètre sont affichés selon vos rôles et
          permissions.
        </p>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Score accès
              </p>
              <ShieldCheck className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black text-[#0b7a4b]">
              {dashboardSummary.accessScore}%
            </p>
            <p className="text-muted mt-1 text-xs">
              préparation opérationnelle
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Rôles
              </p>
              <BadgeCheck className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {dashboardSummary.roleCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              {dashboardSummary.permissionCount} permission(s)
            </p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Entreprises
              </p>
              <MapPin className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {dashboardSummary.businessScopeCount}
            </p>
            <p className="text-muted mt-1 text-xs">périmètre autorisé</p>
          </article>
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Boutiques
              </p>
              <Store className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {dashboardSummary.storeScopeCount}
            </p>
            <p className="text-muted mt-1 text-xs">
              points de vente accessibles
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <LayoutDashboard className="size-5 text-[#0b7a4b]" />
            <h2 className="mt-4 font-bold">Mon activité</h2>
            <p className="text-muted mt-2 text-xs">
              Vue personnelle et informations autorisées.
            </p>
          </article>

          {dashboardSummary.canUsePos && (
            <Link
              href="/pos"
              className="rounded-2xl border border-[#e1e7e3] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#0b7a4b]/30 hover:shadow-lg hover:shadow-[#0b7a4b]/5"
            >
              <ShoppingCart className="size-5 text-[#0b7a4b]" />
              <h2 className="mt-4 font-bold">Caisse POS</h2>
              <p className="text-muted mt-2 text-xs">
                Accès autorisé selon votre rôle.
              </p>
            </Link>
          )}

          {dashboardSummary.canUseBookings && (
            <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
              <CalendarDays className="size-5 text-[#0b7a4b]" />
              <h2 className="mt-4 font-bold">Agenda</h2>
              <p className="text-muted mt-2 text-xs">
                Rendez-vous et prestations autorisés.
              </p>
            </article>
          )}

          {(dashboardSummary.canViewAccounting ||
            dashboardSummary.canManageInventory) && (
            <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
              <KeyRound className="size-5 text-[#0b7a4b]" />
              <h2 className="mt-4 font-bold">Accès spécialisé</h2>
              <p className="text-muted mt-2 text-xs">
                Comptabilité ou stock disponibles selon votre périmètre.
              </p>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
