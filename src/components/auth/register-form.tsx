"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/lib/supabaseClient";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Indiquez votre prénom."),
    lastName: z.string().trim().min(2, "Indiquez votre nom."),
    email: z.email("Saisissez une adresse e-mail valide."),
    password: z
      .string()
      .min(12, "Utilisez au moins 12 caractères.")
      .regex(/[a-z]/, "Ajoutez une minuscule.")
      .regex(/[A-Z]/, "Ajoutez une majuscule.")
      .regex(/\d/, "Ajoutez un chiffre.")
      .regex(/[^A-Za-z0-9]/, "Ajoutez un symbole."),
    confirmation: z.string(),
    terms: z.boolean().refine(Boolean, {
      message: "Vous devez accepter les conditions d’utilisation.",
    }),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ["confirmation"],
    message: "Les mots de passe ne correspondent pas.",
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmation: "",
      terms: false,
    },
  });

  async function onSubmit(values: RegisterValues) {
    const email = values.email.trim().toLowerCase();
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`,
          account_type: "owner",
        },
      },
    });

    if (error) {
      setError("root", {
        message: error.message.toLowerCase().includes("already registered")
          ? "Un compte existe déjà avec cette adresse e-mail."
          : "L’inscription a échoué. Vérifiez vos informations.",
      });
      return;
    }

    if (data.session) {
      window.location.assign("/auth/callback");
      return;
    }

    setConfirmationEmail(email);
  }

  if (confirmationEmail) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-6">
        <section className="w-full max-w-md rounded-3xl border border-[#e2e8e4] bg-white p-8 text-center shadow-xl shadow-[#0a3827]/5">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="mt-6 text-3xl font-bold">Vérifiez votre e-mail</h1>
          <p className="text-muted mt-3 text-sm leading-6">
            Un lien de confirmation a été envoyé à{" "}
            <strong className="text-foreground">{confirmationEmail}</strong>.
          </p>
          <p className="text-muted mt-3 text-xs leading-5">
            Cliquez sur le lien reçu pour continuer la création de votre
            entreprise.
          </p>
          <Link
            href="/connexion"
            className="text-brand mt-7 inline-flex text-sm font-bold"
          >
            Retour à la connexion
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/connexion"
            className="text-muted flex items-center gap-2 text-xs font-bold"
          >
            <ArrowLeft className="size-4" /> Se connecter
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
          <span className="text-brand grid size-11 place-items-center rounded-2xl bg-[#e9f5ee]">
            <Store className="size-5" />
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-[-0.045em]">
            Créez votre espace commerçant.
          </h1>
          <p className="text-muted mt-3 text-sm leading-6">
            Commencez par votre compte propriétaire. Votre entreprise et votre
            première boutique viennent ensuite.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Prénom" error={errors.firstName?.message}>
                <input
                  {...register("firstName")}
                  className="form-input"
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Nom" error={errors.lastName?.message}>
                <input
                  {...register("lastName")}
                  className="form-input"
                  autoComplete="family-name"
                />
              </Field>
            </div>
            <Field label="Adresse e-mail" error={errors.email?.message}>
              <input
                type="email"
                {...register("email")}
                className="form-input"
                autoComplete="email"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <PasswordField
                label="Mot de passe"
                field={register("password")}
                visible={showPassword}
                toggle={() => setShowPassword((value) => !value)}
                error={errors.password?.message}
              />
              <PasswordField
                label="Confirmation"
                field={register("confirmation")}
                visible={showPassword}
                toggle={() => setShowPassword((value) => !value)}
                error={errors.confirmation?.message}
              />
            </div>
            <label className="flex items-start gap-3 text-xs leading-5">
              <input
                type="checkbox"
                {...register("terms")}
                className="mt-1 size-4 accent-[#0b7a4b]"
              />
              <span>
                J’accepte les conditions d’utilisation et la politique de
                confidentialité.
              </span>
            </label>
            {errors.terms && (
              <p className="text-xs text-red-600">{errors.terms.message}</p>
            )}
            {errors.root && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                {errors.root.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
              Créer mon compte
            </button>
          </form>
          <div className="text-muted mt-6 flex items-center justify-center gap-2 text-xs">
            <ShieldCheck className="text-brand size-4" /> Données sécurisées par
            Supabase
          </div>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#062d1f] p-14 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="hero-grid absolute inset-0 opacity-25" />
        <div className="relative max-w-xl">
          <p className="text-accent text-xs font-bold tracking-[0.18em] uppercase">
            AFRICRM Shop
          </p>
          <h2 className="mt-5 text-5xl font-bold tracking-[-0.05em]">
            Votre commerce. Vos boutiques. Votre équipe.
          </h2>
          <p className="mt-6 text-sm leading-7 text-white/60">
            Pilotez la caisse, le stock, les clients ou les rendez-vous depuis
            un espace conçu pour votre activité.
          </p>
        </div>
      </aside>
    </main>
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

function PasswordField({
  label,
  field,
  visible,
  toggle,
  error,
}: Readonly<{
  label: string;
  field: UseFormRegisterReturn;
  visible: boolean;
  toggle: () => void;
  error?: string;
}>) {
  return (
    <Field label={label} error={error}>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          {...field}
          className="form-input pr-11"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
          className="text-muted absolute top-1/2 right-3 -translate-y-1/2"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </Field>
  );
}
