import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";

export default async function OwnerSettingsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <p className="text-muted mt-2 text-sm">
        Profil propriétaire et sécurité du compte.
      </p>
      <section className="mt-7 rounded-3xl border border-[#e1e7e3] bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <UserRound className="size-5 text-[#0b7a4b]" />
          <h2 className="font-bold">Profil</h2>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f6f8f6] p-4">
            <dt className="text-muted text-[10px] font-bold uppercase">Nom</dt>
            <dd className="mt-2 text-sm font-bold">{owner.displayName}</dd>
          </div>
          <div className="rounded-2xl bg-[#f6f8f6] p-4">
            <dt className="text-muted flex items-center gap-2 text-[10px] font-bold uppercase">
              <Mail className="size-3" /> E-mail
            </dt>
            <dd className="mt-2 text-sm font-bold">{owner.email}</dd>
          </div>
        </dl>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs text-emerald-800">
          <ShieldCheck className="size-5" />
          <span>Compte actif et sécurisé par Supabase Auth.</span>
        </div>
      </section>
    </div>
  );
}
