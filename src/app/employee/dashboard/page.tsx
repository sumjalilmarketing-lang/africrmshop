import { CalendarDays, LayoutDashboard, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";

export default async function EmployeeDashboardPage() {
  const employee = await getAppSession();
  if (!employee) redirect("/connexion");
  if (employee.mustChangePassword) redirect("/changer-mot-de-passe");
  if (!employee.isEmployee) redirect(employee.defaultRoute);
  const canUsePos = employee.permissions.includes("pos.access");
  const canUseBookings = employee.permissions.includes("bookings.access");

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold text-[#0b7a4b]">Espace employé</p>
        <h1 className="mt-2 text-3xl font-bold">
          Bonjour, {employee.displayName}
        </h1>
        <p className="text-muted mt-2 text-sm">
          Vos outils sont affichés selon votre rôle.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
            <LayoutDashboard className="size-5 text-[#0b7a4b]" />
            <h2 className="mt-4 font-bold">Mon activité</h2>
            <p className="text-muted mt-2 text-xs">
              Vue personnelle et informations autorisées.
            </p>
          </article>
          {canUsePos && (
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
          {canUseBookings && (
            <article className="rounded-2xl border border-[#e1e7e3] bg-white p-5">
              <CalendarDays className="size-5 text-[#0b7a4b]" />
              <h2 className="mt-4 font-bold">Agenda</h2>
              <p className="text-muted mt-2 text-xs">
                Rendez-vous et prestations autorisés.
              </p>
            </article>
          )}
        </div>
      </div>
    </main>
  );
}
