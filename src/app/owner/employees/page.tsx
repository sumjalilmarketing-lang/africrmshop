import { BadgeCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { EmployeeInvitationForm } from "@/components/owner/employee-invitation-form";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function OwnerEmployeesPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  const businesses = await getOwnerBusinesses(owner);
  const businessIds = businesses.map((business) => business.id);
  const [employees, stores, roles] = businessIds.length
    ? await Promise.all([
        supabaseAdmin
          .from("employees")
          .select(
            "id, business_id, first_name, last_name, email, job_title, is_active",
          )
          .in("business_id", businessIds)
          .is("deleted_at", null)
          .order("created_at"),
        supabaseAdmin
          .from("stores")
          .select("id, business_id, name")
          .in("business_id", businessIds)
          .is("deleted_at", null)
          .order("created_at"),
        supabaseAdmin
          .from("roles")
          .select("code, name")
          .in("code", [
            "manager",
            "seller",
            "cashier",
            "accountant",
            "hairdresser",
            "technician",
            "receptionist",
          ])
          .is("business_id", null)
          .order("name"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (employees.error || stores.error || roles.error) {
    throw new Error(
      employees.error?.message ?? stores.error?.message ?? roles.error?.message,
    );
  }
  const names = new Map(
    businesses.map((business) => [business.id, business.name]),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold">Mes employés</h1>
      <p className="text-muted mt-2 text-sm">
        Équipe, fonctions et accès à vos activités.
      </p>
      <EmployeeInvitationForm
        businesses={businesses.map((business) => ({
          id: business.id,
          name: business.name,
        }))}
        stores={stores.data ?? []}
        roles={
          (roles.data ?? []) as Array<{
            code:
              | "manager"
              | "seller"
              | "cashier"
              | "accountant"
              | "hairdresser"
              | "technician"
              | "receptionist";
            name: string;
          }>
        }
      />
      <div className="mt-7 overflow-hidden rounded-2xl border border-[#e1e7e3] bg-white">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-4 border-b border-[#e1e7e3] bg-[#fafbfa] px-5 py-3 text-[10px] font-bold text-[#708078] uppercase">
          <span>Employé</span>
          <span>Entreprise</span>
          <span>Fonction</span>
          <span>Statut</span>
        </div>
        {(employees.data ?? []).map((employee) => (
          <div
            key={employee.id}
            className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-4 border-b border-[#edf0ee] px-5 py-4 text-xs last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#e9f5ee] text-[#0b7a4b]">
                <Users className="size-4" />
              </span>
              <div>
                <p className="font-bold">
                  {employee.first_name} {employee.last_name}
                </p>
                <p className="text-muted mt-1 text-[10px]">
                  {employee.email ?? "Sans compte"}
                </p>
              </div>
            </div>
            <span>{names.get(employee.business_id)}</span>
            <span className="text-muted">
              {employee.job_title ?? "Non définie"}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <BadgeCheck className="size-3.5" />{" "}
              {employee.is_active ? "Actif" : "Inactif"}
            </span>
          </div>
        ))}
        {(employees.data ?? []).length === 0 && (
          <p className="text-muted px-5 py-12 text-center text-sm">
            Aucun employé pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
