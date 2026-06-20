"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/lib/supabaseClient";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Utilisez au moins 12 caractères.")
      .regex(/[a-z]/, "Ajoutez une lettre minuscule.")
      .regex(/[A-Z]/, "Ajoutez une lettre majuscule.")
      .regex(/\d/, "Ajoutez un chiffre.")
      .regex(/[^A-Za-z0-9]/, "Ajoutez un symbole."),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ["confirmation"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ChangePasswordForm({
  email,
}: Readonly<{ email: string | null }>) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmation: "" },
  });

  async function onSubmit(values: PasswordValues) {
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: values.password }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError("root", {
        message: result?.error ?? "Le mot de passe n’a pas pu être modifié.",
      });
      return;
    }

    await supabase.auth.signOut();
    toast.success("Mot de passe sécurisé", {
      description: "Reconnectez-vous avec votre nouveau mot de passe.",
    });
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7f5] px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#e3e9e5] bg-white p-7 shadow-xl shadow-[#0a3827]/5 sm:p-10">
        <Logo />
        <span className="text-brand mt-10 grid size-12 place-items-center rounded-2xl bg-[#e9f5ee]">
          <LockKeyhole className="size-5" />
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em]">
          Sécurisez votre compte
        </h1>
        <p className="text-muted mt-3 text-sm leading-6">
          Remplacez le mot de passe temporaire avant d’accéder à votre espace.
          {email ? ` Compte : ${email}.` : ""}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <PasswordField
            id="password"
            label="Nouveau mot de passe"
            visible={showPassword}
            toggle={() => setShowPassword((value) => !value)}
            registration={register("password")}
            error={errors.password?.message}
          />
          <PasswordField
            id="confirmation"
            label="Confirmer le mot de passe"
            visible={showPassword}
            toggle={() => setShowPassword((value) => !value)}
            registration={register("confirmation")}
            error={errors.confirmation?.message}
          />

          <p className="text-muted text-xs leading-5">
            12 caractères minimum, avec majuscule, minuscule, chiffre et
            symbole.
          </p>

          {errors.root && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              {errors.root.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand hover:bg-brand-strong flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-60"
          >
            {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
            Enregistrer mon mot de passe
          </button>
        </form>

        <div className="text-muted mt-6 flex items-center justify-center gap-2 text-xs">
          <ShieldCheck className="text-brand size-4" />
          Votre session sera fermée après la modification.
        </div>
      </section>
    </main>
  );
}

function PasswordField({
  id,
  label,
  visible,
  toggle,
  registration,
  error,
}: Readonly<{
  id: string;
  label: string;
  visible: boolean;
  toggle: () => void;
  registration: UseFormRegisterReturn;
  error?: string;
}>) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          {...registration}
          className="border-border focus:border-brand focus:ring-brand/10 h-12 w-full rounded-xl border bg-[#fafbfa] px-4 pr-12 text-sm outline-none focus:ring-4"
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
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
