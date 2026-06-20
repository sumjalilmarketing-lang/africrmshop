import { BadgeCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { EmployeeInvitationForm } from "@/components/owner/employee-invitation-form";
import { PendingInvitations } from "@/components/owner/pending-invitations";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type EmployeeRoleCode =
  | "manager"
  | "seller"
  | "cashier"
  | "accountant"
  | "hairdresser"
  | "technician"
  | "receptionist";

function getAllowedRoleCodes(business: {
  activity: { code: string; capabilities: Record<string, unknown> } | null;
}) {
  const allowed = new Set<EmployeeRoleCode>([
    "manager",
    "cashier",
    "accountant",
  ]);
  const activity = business.activity;
  if (!activity) return [...allowed];
  if (activity.capabilities.inventory === true) allowed.add("seller");
  if (["hair_salon", "beauty_institute"].includes(activity.code)) {
    allowed.add("hairdresser");
  }
  if (["garage", "service"].includes(activity.code)) {
    allowed.add("technician");
  }
  if (activity.capabilities.bookings === true) allowed.add("receptionist");
  return [...allowed];
}

export default async function OwnerEmployeesPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  const businesses = await getOwnerBusinesses(owner);
  const businessIds = businesses.map((business) => business.id);
  const [employees, stores, roles, invitations] = businessIds.length
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
          .select("id, code, name")
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
        supabaseAdmin
          .from("employee_invitations")
          .select(
            "id, business_id, store_id, role_id, email, first_name, last_name, expires_at",
          )
          .in("business_id", businessIds)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (employees.error || stores.error || roles.error || invitations.error) {
    throw new Error(
      employees.error?.message ??
        stores.error?.message ??
        roles.error?.message ??
        invitations.error?.message,
    );
  }
  const names = new Map(
    businesses.map((business) => [business.id, business.name]),
  );
  const storeNames = new Map(
    (stores.data ?? []).map((store) => [store.id, store.name]),
  );
  const roleNames = new Map(
    (roles.data ?? []).map((role) => [role.code, role.name]),
  );
  const roleCodesById = new Map(
    (roles.data ?? []).map((role) => [role.id, role.code]),
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
        allowedRoleCodesByBusiness={Object.fromEntries(
          businesses.map((business) => [
            business.id,
            getAllowedRoleCodes(business),
          ]),
        )}
        roles={
          (roles.data ?? []) as Array<{
            code: EmployeeRoleCode;
            name: string;
          }>
        }
      />
      <PendingInvitations
        invitations={(invitations.data ?? []).map((invitation) => {
          const roleCode = roleCodesById.get(invitation.role_id);
          return {
            id: invitation.id,
            email: invitation.email,
            firstName: invitation.first_name,
            lastName: invitation.last_name,
            businessName: names.get(invitation.business_id) ?? "Entreprise",
            storeName: storeNames.get(invitation.store_id) ?? "Boutique",
            roleName: roleCode
              ? (roleNames.get(roleCode) ?? "Employé")
              : "Employé",
            expiresAt: invitation.expires_at,
          };
        })}
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
