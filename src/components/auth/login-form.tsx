"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/lib/supabaseClient";

const loginSchema = z.object({
  email: z.email("Saisissez une adresse e-mail valide."),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseKey.startsWith("remplacer_")) {
      setError("root", {
        message:
          "La connexion Supabase doit être configurée dans le fichier .env.local.",
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword(values);

      if (error) {
        setError("root", {
          message:
            error.message === "Invalid login credentials"
              ? "E-mail ou mot de passe incorrect."
              : "Connexion impossible. Vérifiez vos informations et réessayez.",
        });
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });

      if (!sessionResponse.ok) {
        const result = (await sessionResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        await supabase.auth.signOut();
        setError("root", {
          message:
            result?.error ??
            "Ce compte n’est pas autorisé à accéder à l’administration.",
        });
        return;
      }

      const sessionResult = (await sessionResponse.json()) as {
        redirectTo: string;
      };

      toast.success("Connexion réussie", {
        description: "Bienvenue dans votre espace AFRICRM Shop.",
      });
      router.push(sessionResult.redirectTo);
      router.refresh();
    } catch {
      setError("root", {
        message: "Un problème réseau est survenu. Réessayez dans un instant.",
      });
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Retour à l’accueil">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-muted hover:text-foreground flex items-center gap-2 text-xs font-semibold transition"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Retour au site</span>
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-14">
          <div className="mb-9">
            <span className="text-brand mb-5 grid size-11 place-items-center rounded-2xl bg-[#e9f5ee]">
              <LockKeyhole className="size-5" />
            </span>
            <h1 className="text-foreground text-4xl font-bold tracking-[-0.045em] sm:text-[2.7rem]">
              Heureux de vous revoir.
            </h1>
            <p className="text-muted mt-3 text-sm leading-6">
              Connectez-vous pour retrouver votre caisse, vos ventes et toute
              l’activité de votre entreprise.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="text-foreground mb-2 block text-sm font-bold"
              >
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@entreprise.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
                className="border-border placeholder:text-muted/55 focus:border-brand focus:ring-brand/8 h-13 w-full rounded-xl border bg-[#fafbfa] px-4 text-sm transition outline-none focus:bg-white focus:ring-4"
              />
              {errors.email && (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-foreground text-sm font-bold"
                >
                  Mot de passe
                </label>
                <span className="text-muted text-[11px] font-medium">
                  6 caractères minimum
                </span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                  className="border-border placeholder:text-muted/55 focus:border-brand focus:ring-brand/8 h-13 w-full rounded-xl border bg-[#fafbfa] px-4 pr-12 text-sm transition outline-none focus:bg-white focus:ring-4"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="text-muted hover:bg-border/60 hover:text-foreground absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg transition"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {errors.root && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 font-medium text-red-700"
              >
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group bg-brand shadow-brand/15 hover:bg-brand-strong flex h-13 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="text-muted mt-6 text-center text-xs">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="text-brand font-bold">
              Créer mon espace commerçant
            </Link>
          </p>

          <div className="text-muted mt-8 flex items-center justify-center gap-2 text-[11px] font-medium">
            <ShieldCheck className="text-brand size-4" />
            Connexion sécurisée et données protégées
          </div>
        </div>

        <p className="text-muted text-center text-[10px]">
          © 2026 AFRICRM · Qualité internationale, ancrage local.
        </p>
      </section>

      <aside className="relative hidden overflow-hidden bg-[#062d1f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -top-24 -right-20 size-96 rounded-full bg-[#16845a]/25 blur-[100px]" />
        <div className="bg-accent/10 absolute -bottom-32 -left-20 size-96 rounded-full blur-[110px]" />
        <div className="hero-grid absolute inset-0 opacity-30" />

        <div className="relative flex items-center gap-2 text-xs font-semibold text-[#9bdab7]">
          <Sparkles className="text-accent size-4" />
          Votre entreprise, en un coup d’œil
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <h2 className="max-w-lg text-4xl leading-[1.08] font-bold tracking-[-0.04em] xl:text-5xl">
            Chaque vente vous rapproche de la bonne décision.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-white/55">
            Un espace simple pour suivre votre activité, coordonner votre équipe
            et faire grandir votre commerce sereinement.
          </p>

          <div className="mt-10 rounded-[1.7rem] border border-white/12 bg-white/7 p-3 shadow-2xl backdrop-blur">
            <div className="text-foreground rounded-[1.2rem] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted text-[10px] font-semibold tracking-wider uppercase">
                    Performance du jour
                  </p>
                  <p className="mt-1 text-lg font-bold">Bonjour, Aïssatou</p>
                </div>
                <span className="text-brand grid size-9 place-items-center rounded-xl bg-[#e9f5ee]">
                  <BarChart3 className="size-4" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["Ventes", "48"],
                  ["Recettes", "385 500 F"],
                  ["Panier moyen", "8 031 F"],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className={
                      "rounded-xl p-3 " +
                      (index === 0 ? "bg-[#0a3827] text-white" : "bg-[#f3f6f3]")
                    }
                  >
                    <p
                      className={
                        "text-[9px] " +
                        (index === 0 ? "text-white/50" : "text-muted")
                      }
                    >
                      {label}
                    </p>
                    <p className="mt-2 text-xs font-bold xl:text-sm">{value}</p>
                  </div>
                ))}
              </div>
              <div className="border-border mt-5 flex h-24 items-end gap-2 rounded-xl border px-4 pt-4 pb-3">
                {[38, 54, 44, 70, 62, 88, 76, 92, 68, 84].map(
                  (height, index) => (
                    <div
                      key={index}
                      className={
                        "flex-1 rounded-t-sm " +
                        (index === 7 ? "bg-accent" : "bg-brand/18")
                      }
                      style={{ height: String(height) + "%" }}
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4 text-xs text-white/60">
            {["Suivi en temps réel", "Accès sécurisé par rôle"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-[#79d4a2]/15 text-[#79d4a2]">
                  <Check className="size-3" />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/35">
          AFRICRM Shop · Dakar, Sénégal
        </p>
      </aside>
    </main>
  );
}
