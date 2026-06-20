"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Database,
  Download,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Logo } from "@/components/landing/logo";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { SuperAdminDashboardData } from "@/types/super-admin";

const navigation = [
  [LayoutDashboard, "Vue d’ensemble", "#vue-ensemble"],
  [Building2, "Entreprises", "#entreprises"],
  [Users, "Utilisateurs", "#utilisateurs"],
  [WalletCards, "Abonnements", "#abonnements"],
  [ReceiptText, "Transactions", "#transactions"],
  [LifeBuoy, "Support", "#activite"],
] as const;

const demoMetrics = [
  {
    icon: Building2,
    label: "Entreprises",
    value: "128",
    change: "+12 ce mois",
    trend: "up",
    color: "bg-[#e9f5ee] text-brand",
  },
  {
    icon: Users,
    label: "Utilisateurs actifs",
    value: "1 842",
    change: "+8,4 %",
    trend: "up",
    color: "bg-[#eaf0fb] text-[#3769b2]",
  },
  {
    icon: CircleDollarSign,
    label: "Revenu mensuel",
    value: "18,4 M F",
    change: "+14,2 %",
    trend: "up",
    color: "bg-[#fff3d9] text-[#9b6b08]",
  },
  {
    icon: CreditCard,
    label: "Volume encaissé",
    value: "45,2 M F",
    change: "-1,6 %",
    trend: "down",
    color: "bg-[#f3eafb] text-[#8051a8]",
  },
] as const;

const demoCompanies = [
  {
    name: "Teranga Market",
    initials: "TM",
    sector: "Commerce général",
    plan: "Business",
    users: 24,
    revenue: "2 450 000 F",
    status: "Actif",
    color: "bg-[#e7f4ec] text-brand",
  },
  {
    name: "Baobab Distribution",
    initials: "BD",
    sector: "Distribution",
    plan: "Enterprise",
    users: 68,
    revenue: "6 820 000 F",
    status: "Actif",
    color: "bg-[#fff1d8] text-[#9b6b08]",
  },
  {
    name: "Ndar Boutique",
    initials: "NB",
    sector: "Mode & accessoires",
    plan: "Essentiel",
    users: 5,
    revenue: "685 000 F",
    status: "Essai",
    color: "bg-[#e9effa] text-[#3769b2]",
  },
  {
    name: "Keur Services",
    initials: "KS",
    sector: "Services",
    plan: "Business",
    users: 17,
    revenue: "1 760 000 F",
    status: "Actif",
    color: "bg-[#f2eafa] text-[#8051a8]",
  },
  {
    name: "Sunu Agro",
    initials: "SA",
    sector: "Agroalimentaire",
    plan: "Business",
    users: 31,
    revenue: "3 180 000 F",
    status: "Suspendu",
    color: "bg-[#fce9e7] text-[#b4473b]",
  },
] as const;

const activities = [
  {
    icon: Building2,
    title: "Nouvelle entreprise créée",
    text: "Ndar Boutique a rejoint l’offre Essentiel.",
    time: "Il y a 12 min",
    color: "bg-[#e9f5ee] text-brand",
  },
  {
    icon: CreditCard,
    title: "Paiement reçu",
    text: "Baobab Distribution · 250 000 F CFA",
    time: "Il y a 38 min",
    color: "bg-[#fff3d9] text-[#9b6b08]",
  },
  {
    icon: ShieldCheck,
    title: "Rôle administrateur attribué",
    text: "Aminata Fall · Teranga Market",
    time: "Il y a 1 h",
    color: "bg-[#eaf0fb] text-[#3769b2]",
  },
  {
    icon: LifeBuoy,
    title: "Ticket support résolu",
    text: "Configuration imprimante · Keur Services",
    time: "Il y a 2 h",
    color: "bg-[#f2eafa] text-[#8051a8]",
  },
] as const;

const chartValues = [42, 48, 45, 58, 54, 66, 62, 74, 71, 82, 78, 92];

function Sidebar({
  open,
  onClose,
  onLogout,
  admin,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  admin: { displayName: string; email: string | null };
}>) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer la navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#081d15]/45 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-[#e7ebe8] bg-white p-4 transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between px-2">
          <Link href="/">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="text-muted hover:bg-background grid size-9 place-items-center rounded-xl lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-7 flex items-center gap-3 rounded-2xl bg-[#f3f6f3] p-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#0a3827] text-sm font-bold text-white">
            SA
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">{admin.displayName}</p>
            <p className="text-muted mt-1 truncate text-[10px]">
              {admin.email ?? "Super administrateur"}
            </p>
          </div>
          <ChevronDown className="text-muted size-3.5" />
        </div>

        <nav className="mt-7 flex-1 space-y-1">
          <p className="text-muted/70 mb-3 px-3 text-[9px] font-bold tracking-[0.18em] uppercase">
            Plateforme
          </p>
          {navigation.map(([Icon, label, href], index) => (
            <a
              key={label}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition",
                index === 0
                  ? "text-brand bg-[#e9f5ee]"
                  : "text-muted hover:bg-background hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
              {label === "Support" && (
                <span className="ml-auto rounded-full bg-[#f8e7e3] px-2 py-0.5 text-[9px] font-bold text-[#b4473b]">
                  3
                </span>
              )}
            </a>
          ))}

          <p className="text-muted/70 mt-7 mb-3 px-3 text-[9px] font-bold tracking-[0.18em] uppercase">
            Système
          </p>
          <a
            href="#systeme"
            onClick={onClose}
            className="text-muted hover:bg-background hover:text-foreground flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition"
          >
            <Gauge className="size-4" />
            Santé du service
          </a>
          <a
            href="#parametres"
            onClick={onClose}
            className="text-muted hover:bg-background hover:text-foreground flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition"
          >
            <Settings className="size-4" />
            Paramètres
          </a>
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className="border-border text-muted flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-semibold transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="size-4" />
          Se déconnecter
        </button>
      </aside>
    </>
  );
}

export function SuperAdminDashboard({
  demoMode,
  data,
  admin = { displayName: "Super Admin", email: "admin@africrm.com" },
}: Readonly<{
  demoMode: boolean;
  data?: SuperAdminDashboardData;
  admin?: { displayName: string; email: string | null };
}>) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Tous");

  const companies = data?.businesses ?? demoCompanies;
  const metrics = data
    ? [
        {
          icon: Building2,
          label: "Entreprises",
          value: String(data.stats.businesses),
          change: `${data.stats.activeBusinesses} actives`,
          trend: "up",
          color: "bg-[#e9f5ee] text-brand",
        },
        {
          icon: Users,
          label: "Utilisateurs actifs",
          value: String(data.stats.activeUsers),
          change: "Données réelles",
          trend: "up",
          color: "bg-[#eaf0fb] text-[#3769b2]",
        },
        {
          icon: CircleDollarSign,
          label: "Revenu mensuel",
          value: data.stats.monthlyRevenue,
          change: "Ce mois",
          trend: "up",
          color: "bg-[#fff3d9] text-[#9b6b08]",
        },
        {
          icon: CreditCard,
          label: "Volume encaissé",
          value: data.stats.collectedVolume,
          change: "Paiements réussis",
          trend: "up",
          color: "bg-[#f3eafb] text-[#8051a8]",
        },
      ]
    : demoMetrics;

  const filteredCompanies = useMemo(
    () =>
      companies.filter(
        (company) =>
          (status === "Tous" || company.status === status) &&
          (company.name.toLowerCase().includes(query.toLowerCase()) ||
            company.sector.toLowerCase().includes(query.toLowerCase())),
      ),
    [companies, query, status],
  );

  async function handleLogout() {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      await supabase.auth.signOut();
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/connexion");
    router.refresh();
  }

  return (
    <div className="text-foreground min-h-screen bg-[#f4f6f4]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        admin={admin}
      />

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-17 items-center border-b border-[#e6eae7] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            className="border-border mr-3 grid size-9 place-items-center rounded-xl border lg:hidden"
          >
            <Menu className="size-4" />
          </button>
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Recherche globale"
              placeholder="Rechercher sur la plateforme..."
              className="border-border focus:border-brand focus:ring-brand/8 h-10 w-full rounded-xl border bg-[#f8faf8] pr-4 pl-10 text-xs outline-none focus:ring-3"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {demoMode && (
              <span className="hidden rounded-full border border-[#ebcf8f] bg-[#fff7df] px-3 py-1.5 text-[10px] font-bold text-[#8d650e] sm:inline-flex">
                Données de démonstration
              </span>
            )}
            <button
              type="button"
              aria-label="Notifications"
              className="border-border text-muted relative grid size-10 place-items-center rounded-xl border bg-white"
            >
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full border-2 border-white bg-red-500" />
            </button>
            <div className="ml-1 grid size-10 place-items-center rounded-xl bg-[#0a3827] text-xs font-bold text-white">
              SA
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section
            id="vue-ensemble"
            className="mx-auto max-w-[1500px] scroll-mt-24"
          >
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-brand text-xs font-semibold">
                  Vendredi 19 juin 2026
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
                  Bonjour, {admin.displayName}
                </h1>
                <p className="text-muted mt-2 text-xs sm:text-sm">
                  Voici ce qui se passe sur AFRICRM Shop aujourd’hui.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="border-border text-muted hover:text-foreground flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-xs font-bold transition"
                >
                  <Download className="size-3.5" />
                  Exporter
                </button>
                <Link
                  href="/super-admin/entreprises/nouvelle"
                  className="bg-brand shadow-brand/15 flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-lg"
                >
                  <Plus className="size-3.5" />
                  Nouvelle entreprise
                </Link>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                const TrendIcon =
                  metric.trend === "up" ? ArrowUpRight : ArrowDownRight;
                return (
                  <article
                    key={metric.label}
                    className="rounded-2xl border border-[#e7ebe8] bg-white p-5"
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "grid size-10 place-items-center rounded-xl",
                          metric.color,
                        )}
                      >
                        <Icon className="size-[18px]" />
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold",
                          metric.trend === "up"
                            ? "text-brand bg-[#eaf6ee]"
                            : "bg-red-50 text-red-600",
                        )}
                      >
                        <TrendIcon className="size-3" />
                        {metric.change}
                      </span>
                    </div>
                    <p className="mt-6 text-2xl font-bold tracking-tight">
                      {metric.value}
                    </p>
                    <p className="text-muted mt-1 text-[11px] font-medium">
                      {metric.label}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_0.75fr]">
              <article
                id="abonnements"
                className="scroll-mt-24 rounded-2xl border border-[#e7ebe8] bg-white p-5 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold">
                      Croissance des revenus
                    </h2>
                    <p className="text-muted mt-1 text-[10px]">
                      Revenu mensuel récurrent · 12 mois
                    </p>
                  </div>
                  <button
                    type="button"
                    className="border-border text-muted flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-semibold"
                  >
                    2026
                    <ChevronDown className="size-3" />
                  </button>
                </div>
                <div className="mt-7 flex h-52 items-end gap-2 sm:gap-3">
                  {chartValues.map((value, index) => (
                    <div
                      key={index}
                      className="group flex h-full flex-1 flex-col justify-end"
                    >
                      <div
                        className={cn(
                          "group-hover:bg-brand relative rounded-t-md transition",
                          index === chartValues.length - 1
                            ? "bg-brand"
                            : "bg-[#dbe9df]",
                        )}
                        style={{ height: String(value) + "%" }}
                      >
                        {index === chartValues.length - 1 && (
                          <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-[#0a3827] px-2 py-1 text-[8px] whitespace-nowrap text-white">
                            18,4 M
                          </span>
                        )}
                      </div>
                      <span className="text-muted mt-2 text-center text-[8px]">
                        {
                          [
                            "J",
                            "F",
                            "M",
                            "A",
                            "M",
                            "J",
                            "J",
                            "A",
                            "S",
                            "O",
                            "N",
                            "D",
                          ][index]
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-[#e7ebe8] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Offres actives</h2>
                    <p className="text-muted mt-1 text-[10px]">
                      128 entreprises
                    </p>
                  </div>
                  <MoreHorizontal className="text-muted size-4" />
                </div>
                <div className="mt-6 flex items-center gap-6">
                  <div
                    className="relative grid size-32 shrink-0 place-items-center rounded-full"
                    style={{
                      background:
                        "conic-gradient(#0b7a4b 0 46%, #f4b740 46% 78%, #6e8ac9 78% 100%)",
                    }}
                  >
                    <div className="grid size-20 place-items-center rounded-full bg-white text-center">
                      <div>
                        <p className="text-xl font-bold">128</p>
                        <p className="text-muted text-[8px]">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-4">
                    {[
                      ["Business", "59", "bg-brand"],
                      ["Essentiel", "41", "bg-accent"],
                      ["Enterprise", "28", "bg-[#6e8ac9]"],
                    ].map(([label, value, color]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", color)} />
                        <span className="text-muted flex-1 text-[10px]">
                          {label}
                        </span>
                        <span className="text-[10px] font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-7 rounded-xl bg-[#f5f8f5] px-4 py-3">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted">Taux de conversion essai</span>
                    <span className="text-brand font-bold">32,8 %</span>
                  </div>
                </div>
              </article>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.65fr]">
              <article
                id="entreprises"
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white"
              >
                <div className="border-border flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Entreprises récentes</h2>
                    <p className="text-muted mt-1 text-[10px]">
                      Gérez les comptes clients de la plateforme
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="text-muted absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        aria-label="Rechercher une entreprise"
                        placeholder="Rechercher..."
                        className="border-border focus:border-brand h-9 w-full rounded-lg border bg-[#fafbfa] pr-3 pl-9 text-[10px] outline-none"
                      />
                    </div>
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      aria-label="Filtrer par statut"
                      className="border-border h-9 rounded-lg border bg-[#fafbfa] px-2 text-[10px] font-semibold outline-none"
                    >
                      <option>Tous</option>
                      <option>Actif</option>
                      <option>Essai</option>
                      <option>Suspendu</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="border-border text-muted border-b bg-[#fafbfa] text-[9px] font-bold tracking-wider uppercase">
                        <th className="px-5 py-3">Entreprise</th>
                        <th className="px-4 py-3">Offre</th>
                        <th className="px-4 py-3">Équipe</th>
                        <th className="px-4 py-3">Volume mensuel</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {filteredCompanies.map((company) => (
                        <tr
                          key={company.name}
                          className="text-[11px] hover:bg-[#fbfcfb]"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "grid size-9 place-items-center rounded-xl text-[10px] font-bold",
                                  company.color,
                                )}
                              >
                                {company.initials}
                              </span>
                              <div>
                                <p className="font-bold">{company.name}</p>
                                <p className="text-muted mt-1 text-[9px]">
                                  {company.sector}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-semibold">
                            {company.plan}
                          </td>
                          <td className="text-muted px-4 py-3.5">
                            {company.users} utilisateurs
                          </td>
                          <td className="px-4 py-3.5 font-semibold">
                            {company.revenue}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold",
                                company.status === "Actif" &&
                                  "text-brand bg-[#e9f5ee]",
                                company.status === "Essai" &&
                                  "bg-[#fff4dc] text-[#96680d]",
                                company.status === "Suspendu" &&
                                  "bg-red-50 text-red-600",
                              )}
                            >
                              {company.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              aria-label={"Actions pour " + company.name}
                              className="text-muted hover:bg-background grid size-8 place-items-center rounded-lg"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCompanies.length === 0 && (
                    <div className="text-muted px-5 py-12 text-center text-xs">
                      Aucune entreprise ne correspond à votre recherche.
                    </div>
                  )}
                </div>
                <div className="border-border text-muted flex items-center justify-between border-t px-5 py-3 text-[10px]">
                  <span>
                    {filteredCompanies.length} entreprise(s) affichée(s)
                  </span>
                  <button
                    type="button"
                    className="text-brand flex items-center gap-1 font-bold"
                  >
                    Voir toutes les entreprises
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              </article>

              <article
                id="activite"
                className="scroll-mt-24 rounded-2xl border border-[#e7ebe8] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Activité récente</h2>
                    <p className="text-muted mt-1 text-[10px]">
                      Dernières opérations
                    </p>
                  </div>
                  <Activity className="text-muted size-4" />
                </div>
                <div className="mt-5 space-y-5">
                  {activities.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.title} className="flex gap-3">
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl",
                            activity.color,
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold">
                            {activity.title}
                          </p>
                          <p className="text-muted mt-1 text-[9px] leading-4">
                            {activity.text}
                          </p>
                          <p className="text-muted/70 mt-1 text-[8px]">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </div>

            <section
              id="systeme"
              className="mt-4 grid scroll-mt-24 gap-4 md:grid-cols-3"
            >
              {[
                [Server, "API & application", "Opérationnel", "99,99 %"],
                [Database, "Base de données", "Opérationnel", "42 ms"],
                [Zap, "Tâches en arrière-plan", "Opérationnel", "0 en attente"],
              ].map(([Icon, title, state, detail]) => {
                const StatusIcon = Icon as typeof Server;
                return (
                  <article
                    key={title as string}
                    className="flex items-center gap-4 rounded-2xl border border-[#e7ebe8] bg-white p-4"
                  >
                    <span className="text-brand grid size-10 place-items-center rounded-xl bg-[#edf5ef]">
                      <StatusIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold">{title as string}</p>
                      <div className="text-muted mt-1 flex items-center gap-2 text-[9px]">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {state as string}
                      </div>
                    </div>
                    <span className="text-muted text-[9px] font-semibold">
                      {detail as string}
                    </span>
                  </article>
                );
              })}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
