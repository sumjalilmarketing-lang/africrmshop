"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ownerBusinessSchema,
  type OwnerBusinessInput,
} from "@/lib/validation/owner-business";

type Option = { code: string; name: string; description: string | null };

export function OwnerBusinessForm({
  activities,
  plans,
}: Readonly<{ activities: Option[]; plans: Option[] }>) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerBusinessInput>({
    resolver: zodResolver(ownerBusinessSchema),
    defaultValues: {
      name: "",
      legalName: "",
      activityTypeCode: activities[0]?.code ?? "boutique",
      planCode: plans[0]?.code ?? "essential",
      phone: "",
      storeName: "Boutique principale",
      storeCode: "HQ",
      city: "Dakar",
    },
  });

  async function onSubmit(values: OwnerBusinessInput) {
    const response = await fetch("/api/owner/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json().catch(() => null)) as {
      redirectTo?: string;
      error?: string;
    } | null;
    if (!response.ok || !result?.redirectTo) {
      setError("root", {
        message: result?.error ?? "La création a échoué.",
      });
      return;
    }
    router.replace(result.redirectTo);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <p className="text-xs font-bold text-[#0b7a4b]">Onboarding</p>
        <h1 className="mt-2 text-3xl font-bold">Créer mon entreprise</h1>
        <p className="text-muted mt-2 text-sm">
          Configurez votre activité et votre premier point de vente.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-6">
        <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Building2 className="size-5 text-[#0b7a4b]" />
            <h2 className="font-bold">Entreprise</h2>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Nom commercial" error={errors.name?.message}>
              <input {...register("name")} className="form-input" />
            </Field>
            <Field label="Raison sociale" error={errors.legalName?.message}>
              <input {...register("legalName")} className="form-input" />
            </Field>
            <Field
              label="Type d’activité"
              error={errors.activityTypeCode?.message}
            >
              <select {...register("activityTypeCode")} className="form-input">
                {activities.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offre" error={errors.planCode?.message}>
              <select {...register("planCode")} className="form-input">
                {plans.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Téléphone" error={errors.phone?.message}>
              <input {...register("phone")} className="form-input" />
            </Field>
          </div>
        </section>
        <section className="rounded-3xl border border-[#e1e7e3] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Store className="size-5 text-[#0b7a4b]" />
            <h2 className="font-bold">Première boutique</h2>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field
              label="Nom du point de vente"
              error={errors.storeName?.message}
            >
              <input {...register("storeName")} className="form-input" />
            </Field>
            <Field label="Code boutique" error={errors.storeCode?.message}>
              <input
                {...register("storeCode")}
                className="form-input uppercase"
              />
            </Field>
            <Field label="Ville" error={errors.city?.message}>
              <input {...register("city")} className="form-input" />
            </Field>
          </div>
        </section>
        {errors.root && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
            {errors.root.message}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 items-center gap-2 rounded-xl bg-[#0b7a4b] px-7 text-sm font-bold text-white disabled:opacity-60"
          >
            {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}{" "}
            Créer et continuer
          </button>
        </div>
      </form>
    </div>
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
