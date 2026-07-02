import {
  Building2,
  CalendarClock,
  Mail,
  ShieldCheck,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { getOwnerBusinesses } from "@/lib/owner-dashboard";
import { buildOwnerSettingsSummary } from "@/lib/owner-settings-summary";

export default async function OwnerSettingsPage() {
  const owner = await getOwnerSession();
  if (!owner) redirect("/connexion");
  if (owner.mustChangePassword) redirect("/changer-mot-de-passe");

  const businesses = await getOwnerBusinesses(owner);
  const settingsSummary = buildOwnerSettingsSummary({
    businesses,
    today: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-black tracking-[0.3em] text-[#0b7a4b] uppercase">
        POS 42
      </p>
      <h1 className="mt-3 text-3xl font-bold">Paramètres</h1>
      <p className="text-muted mt-2 text-sm">
        Profil propriétaire, sécurité du compte et préparation opérationnelle.
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

      <section className="mt-6 rounded-3xl border border-[#e1e7e3] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Préparation opérationnelle</h2>
            <p className="text-muted mt-1 text-xs">
              Vérifiez que le compte propriétaire est prêt pour exploiter
              AFRICRM Shop en production.
            </p>
          </div>
          <span className="rounded-full bg-[#e9f5ee] px-4 py-2 text-xs font-black text-[#0b7a4b]">
            Score {settingsSummary.operationalScore}%
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl bg-[#f6f8f6] p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Entreprises actives
              </p>
              <Building2 className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {settingsSummary.activeBusinessCount}/
              {settingsSummary.businessCount}
            </p>
          </article>
          <article className="rounded-2xl bg-[#f6f8f6] p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Boutiques configurées
              </p>
              <Store className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {settingsSummary.storeCount}
            </p>
          </article>
          <article className="rounded-2xl bg-[#f6f8f6] p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Employés actifs
              </p>
              <Users className="size-4 text-[#0b7a4b]" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {settingsSummary.employeeCount}
            </p>
          </article>
          <article className="rounded-2xl bg-[#f6f8f6] p-4">
            <div className="flex items-center justify-between">
              <p className="text-muted text-[10px] font-bold uppercase">
                Essais à surveiller
              </p>
              <CalendarClock className="size-4 text-amber-600" />
            </div>
            <p className="mt-3 text-2xl font-black">
              {settingsSummary.trialEndingSoonCount}
            </p>
          </article>
        </div>

        {settingsSummary.onboardingIncompleteCount > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800">
            {settingsSummary.onboardingIncompleteCount} entreprise(s) ont encore
            un onboarding incomplet.
          </div>
        )}
      </section>
    </div>
  );
}
