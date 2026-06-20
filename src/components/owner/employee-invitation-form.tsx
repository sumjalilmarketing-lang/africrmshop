"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  employeeInvitationSchema,
  type EmployeeInvitationInput,
} from "@/lib/validation/employee-invitation";

export function EmployeeInvitationForm({
  businesses,
  stores,
  roles,
  allowedRoleCodesByBusiness,
}: Readonly<{
  businesses: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; business_id: string; name: string }>;
  roles: Array<{ code: EmployeeInvitationInput["roleCode"]; name: string }>;
  allowedRoleCodesByBusiness: Record<
    string,
    EmployeeInvitationInput["roleCode"][]
  >;
}>) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeInvitationInput>({
    resolver: zodResolver(employeeInvitationSchema),
    defaultValues: {
      businessId: businesses[0]?.id ?? "",
      storeId: stores[0]?.id ?? "",
      roleCode: roles[0]?.code ?? "seller",
      email: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
    },
  });
  const selectedBusiness = useWatch({ control, name: "businessId" });
  const selectedStore = useWatch({ control, name: "storeId" });
  const availableStores = stores.filter(
    (store) => store.business_id === selectedBusiness,
  );
  const allowedRoleCodes = allowedRoleCodesByBusiness[selectedBusiness] ?? [];
  const availableRoles = roles.filter((role) =>
    allowedRoleCodes.includes(role.code),
  );
  const selectedRole = useWatch({ control, name: "roleCode" });

  useEffect(() => {
    if (!availableStores.some((store) => store.id === selectedStore)) {
      setValue("storeId", availableStores[0]?.id ?? "");
    }
  }, [availableStores, selectedStore, setValue]);

  useEffect(() => {
    if (!availableRoles.some((role) => role.code === selectedRole)) {
      setValue("roleCode", availableRoles[0]?.code ?? "manager");
    }
  }, [availableRoles, selectedRole, setValue]);

  async function onSubmit(values: EmployeeInvitationInput) {
    const response = await fetch("/api/owner/employee-invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setError("root", {
        message: result?.error ?? "L’invitation n’a pas pu être envoyée.",
      });
      return;
    }
    toast.success("Invitation envoyée");
    reset({
      ...values,
      email: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
    });
    router.refresh();
  }

  if (!businesses.length || !stores.length) return null;

  return (
    <details className="mt-7 rounded-2xl border border-[#dce5df] bg-white p-5">
      <summary className="cursor-pointer text-sm font-bold text-[#0b7a4b]">
        Inviter un employé
      </summary>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Entreprise" error={errors.businessId?.message}>
            <select {...register("businessId")} className="form-input">
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Boutique" error={errors.storeId?.message}>
            <select {...register("storeId")} className="form-input">
              {availableStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rôle" error={errors.roleCode?.message}>
            <select {...register("roleCode")} className="form-input">
              {availableRoles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prénom" error={errors.firstName?.message}>
            <input {...register("firstName")} className="form-input" />
          </Field>
          <Field label="Nom" error={errors.lastName?.message}>
            <input {...register("lastName")} className="form-input" />
          </Field>
          <Field label="E-mail" error={errors.email?.message}>
            <input type="email" {...register("email")} className="form-input" />
          </Field>
          <Field label="Fonction affichée" error={errors.jobTitle?.message}>
            <input {...register("jobTitle")} className="form-input" />
          </Field>
        </div>
        {errors.root && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
            {errors.root.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 items-center gap-2 rounded-xl bg-[#0b7a4b] px-5 text-xs font-bold text-white disabled:opacity-60"
        >
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}{" "}
          Envoyer l’invitation
        </button>
      </form>
    </details>
  );
}

function Field({
  label,
  error,
  children,
}: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-2 block text-red-600">{error}</span>}
    </label>
  );
}
