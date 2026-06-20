"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Logo } from "@/components/landing/logo";
import {
  createBusinessSchema,
  type CreateBusinessInput,
} from "@/lib/validation/business";

type CreatedBusiness = {
  business: { id: string; name: string; slug: string };
  owner: { email: string; temporaryPassword: string };
};

export function CreateBusinessForm({
  activities,
  plans,
}: Readonly<{
  activities: Array<{ code: string; name: string }>;
  plans: Array<{ code: string; name: string }>;
}>) {
  const router = useRouter();
  const [created, setCreated] = useState<CreatedBusiness | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateBusinessInput>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      name: "",
      legalName: "",
      sector: "Commerce général",
      activityTypeCode: activities[0]?.code ?? "boutique",
      plan: plans[0]?.code ?? "essential",
      phone: "",
      ownerFirstName: "",
      ownerLastName: "",
      ownerEmail: "",
    },
  });

  async function onSubmit(values: CreateBusinessInput) {
    const response = await fetch("/api/super-admin/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json().catch(() => null)) as
      | CreatedBusiness
      | { error?: string }
      | null;

    if (!response.ok || !result || !("business" in result)) {
      setError("root", {
        message:
          (result && "error" in result && result.error) ||
          "La création de l’entreprise a échoué.",
      });
      return;
    }

    setCreated(result);
    router.refresh();
  }

  async function copyCredentials() {
    if (!created) return;
    await navigator.clipboard.writeText(
      `E-mail : ${created.owner.email}\nMot de passe temporaire : ${created.owner.temporaryPassword}`,
    );
    toast.success("Identifiants copiés");
  }

  if (created) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-6 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-[#dfe8e2] bg-white p-8 shadow-xl shadow-[#0a3827]/5">
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Entreprise créée
          </h1>
          <p className="text-muted mt-3 text-sm leading-6">
            {created.business.name} et son compte propriétaire sont prêts.
          </p>
          <div className="mt-7 rounded-2xl bg-[#f4f7f5] p-5 text-sm">
            <p className="text-muted text-xs">E-mail propriétaire</p>
            <p className="mt-1 font-bold">{created.owner.email}</p>
            <p className="text-muted mt-4 text-xs">Mot de passe temporaire</p>
            <p className="mt-1 font-mono font-bold break-all">
              {created.owner.temporaryPassword}
            </p>
          </div>
          <p className="mt-4 text-xs leading-5 text-amber-700">
            Copiez ces identifiants maintenant : le mot de passe ne sera plus
            affiché.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={copyCredentials}
              className="bg-brand flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white"
            >
              <Copy className="size-4" />
              Copier les identifiants
            </button>
            <Link
              href="/super-admin"
              className="border-border flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-bold"
            >
              Retour au dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            href="/super-admin"
            className="text-muted flex items-center gap-2 text-xs font-bold"
          >
            <ArrowLeft className="size-4" /> Retour
          </Link>
        </div>
        <section className="mt-8 rounded-3xl border border-[#e2e8e4] bg-white p-6 shadow-sm sm:p-10">
          <div className="flex items-center gap-4">
            <span className="text-brand grid size-12 place-items-center rounded-2xl bg-[#e9f5ee]">
              <Building2 className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Nouvelle entreprise</h1>
              <p className="text-muted mt-1 text-sm">
                Créez l’espace et le premier compte propriétaire.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-8">
            <fieldset>
              <legend className="text-sm font-bold">Entreprise</legend>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Nom commercial" error={errors.name?.message}>
                  <input {...register("name")} className="form-input" />
                </Field>
                <Field label="Raison sociale" error={errors.legalName?.message}>
                  <input {...register("legalName")} className="form-input" />
                </Field>
                <Field label="Secteur" error={errors.sector?.message}>
                  <input {...register("sector")} className="form-input" />
                </Field>
                <Field
                  label="Type d’activité"
                  error={errors.activityTypeCode?.message}
                >
                  <select
                    {...register("activityTypeCode")}
                    className="form-input"
                  >
                    {activities.map((activity) => (
                      <option key={activity.code} value={activity.code}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Offre" error={errors.plan?.message}>
                  <select {...register("plan")} className="form-input">
                    {plans.map((plan) => (
                      <option key={plan.code} value={plan.code}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Téléphone" error={errors.phone?.message}>
                  <input {...register("phone")} className="form-input" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="border-border border-t pt-7">
              <legend className="text-sm font-bold">Propriétaire</legend>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Prénom" error={errors.ownerFirstName?.message}>
                  <input
                    {...register("ownerFirstName")}
                    className="form-input"
                  />
                </Field>
                <Field label="Nom" error={errors.ownerLastName?.message}>
                  <input
                    {...register("ownerLastName")}
                    className="form-input"
                  />
                </Field>
                <Field
                  label="Adresse e-mail"
                  error={errors.ownerEmail?.message}
                >
                  <input
                    type="email"
                    {...register("ownerEmail")}
                    className="form-input"
                  />
                </Field>
              </div>
            </fieldset>

            {errors.root && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                {errors.root.message}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-brand flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-sm font-bold text-white disabled:opacity-60"
              >
                {isSubmitting && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                Créer l’entreprise
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: Readonly<{
  label: string;
  error?: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="block text-xs font-bold">
      {label}
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-2 block text-red-600">{error}</span>}
    </label>
  );
}
