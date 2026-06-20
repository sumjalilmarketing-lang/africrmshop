import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  ScanBarcode,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Logo } from "./logo";

const features = [
  [
    ScanBarcode,
    "Encaissement éclair",
    "Trouvez un article, scannez-le et finalisez la vente en quelques gestes.",
  ],
  [
    Boxes,
    "Stock toujours à jour",
    "Suivez les entrées, les sorties et les seuils d’alerte sans tableur compliqué.",
  ],
  [
    BarChart3,
    "Décisions plus simples",
    "Visualisez vos ventes, marges et produits performants depuis un tableau clair.",
  ],
  [
    Users,
    "Clients fidélisés",
    "Retrouvez l’historique de vos clients et préparez des offres qui leur ressemblent.",
  ],
  [
    ReceiptText,
    "Tickets professionnels",
    "Imprimez ou partagez des reçus propres, personnalisés aux couleurs de votre commerce.",
  ],
  [
    ShieldCheck,
    "Accès bien contrôlés",
    "Attribuez des rôles à votre équipe et gardez une trace claire de chaque opération.",
  ],
] as const;

const audiences = [
  [
    ShoppingBag,
    "Boutiques",
    "Vendre sans ralentir la file",
    "Une caisse immédiate à prendre en main, même pour une petite équipe.",
  ],
  [
    Store,
    "PME",
    "Centraliser toute l’activité",
    "Produits, clients, achats et performances réunis au même endroit.",
  ],
  [
    LayoutDashboard,
    "Multi-sites",
    "Piloter plusieurs points de vente",
    "Une vue consolidée pour suivre chaque établissement avec sérénité.",
  ],
] as const;

const faqs = [
  [
    "AFRICRM Shop convient-il à une petite boutique ?",
    "Oui. L’expérience est pensée pour être simple dès le premier jour, puis s’enrichir à mesure que votre commerce grandit.",
  ],
  [
    "L’application fonctionnera-t-elle sur mobile et tablette ?",
    "Oui. L’interface est conçue pour les ordinateurs, les tablettes et les smartphones afin de s’adapter à votre façon de travailler.",
  ],
  [
    "Mes données seront-elles sécurisées ?",
    "La sécurité fait partie du socle du produit : accès par rôle, connexions sécurisées et sauvegarde dans une infrastructure cloud moderne.",
  ],
  [
    "Puis-je suivre plusieurs points de vente ?",
    "C’est prévu. AFRICRM Shop évoluera d’une caisse simple vers un pilotage consolidé pour les entreprises disposant de plusieurs sites.",
  ],
] as const;

function FeatureSection() {
  return (
    <section id="fonctionnalites" className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12 xl:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-eyebrow">
            Tout ce qu’il faut, rien de superflu
          </p>
          <h2 className="section-title mt-4">
            Votre commerce, enfin réuni dans un seul outil.
          </h2>
          <p className="section-copy mx-auto mt-5">
            Moins de tâches répétitives, plus de visibilité et une équipe qui
            travaille avec les mêmes informations.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([Icon, title, description], index) => (
            <article
              key={title}
              className="group border-border hover:border-brand/20 rounded-3xl border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(10,56,39,0.08)] sm:p-7"
            >
              <div className="mb-8 flex items-start justify-between">
                <span className="text-brand group-hover:bg-brand grid size-12 place-items-center rounded-2xl bg-[#eaf5ee] transition group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="text-muted/55 font-mono text-xs">
                  {"0" + String(index + 1)}
                </span>
              </div>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <p className="text-muted mt-3 text-sm leading-6">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection() {
  const days = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 sm:px-10 lg:grid-cols-2 lg:px-12 xl:px-6">
        <div className="relative rounded-[2rem] bg-[#edf3ee] p-5 sm:p-8">
          <div className="rounded-[1.4rem] bg-white p-5 shadow-xl shadow-[#0a3827]/8 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-xs font-medium">Aujourd’hui</p>
                <h3 className="mt-1 text-lg font-bold">Vue d’ensemble</h3>
              </div>
              <span className="border-border text-muted rounded-lg border px-3 py-2 text-[10px] font-semibold">
                Ce mois
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#0a3827] p-4 text-white">
                <p className="text-[10px] text-white/55">Chiffre d’affaires</p>
                <p className="mt-2 text-xl font-bold">2 485 000 F</p>
                <p className="mt-3 text-[10px] text-[#79d4a2]">
                  ↗ Activité en hausse
                </p>
              </div>
              <div className="rounded-2xl bg-[#f5f7f5] p-4">
                <p className="text-muted text-[10px]">Ventes</p>
                <p className="mt-2 text-xl font-bold">326</p>
                <p className="text-muted mt-3 text-[10px]">
                  Ticket moyen 7 622 F
                </p>
              </div>
            </div>
            <div className="border-border mt-4 rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">Évolution des ventes</p>
                <p className="text-muted text-[10px]">7 derniers jours</p>
              </div>
              <div className="mt-6 flex h-28 items-end gap-2 sm:gap-3">
                {[35, 52, 44, 72, 58, 86, 69].map((height, index) => (
                  <div
                    key={index}
                    className="flex flex-1 flex-col justify-end gap-2"
                  >
                    <div
                      className={
                        "rounded-t-md " +
                        (index === 5 ? "bg-accent" : "bg-brand/20")
                      }
                      style={{ height: String(height) + "%" }}
                    />
                    <span className="text-muted text-center text-[9px]">
                      {days[index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-border absolute -right-4 -bottom-5 hidden rounded-2xl border bg-white px-4 py-3 shadow-xl sm:block">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#fff3d8] text-[#9d6b00]">
                <PackageCheck className="size-4" />
              </span>
              <div>
                <p className="text-muted text-[10px]">Alerte stock</p>
                <p className="text-xs font-bold">3 produits à commander</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="section-eyebrow">Une vision claire chaque matin</p>
          <h2 className="section-title mt-4">
            Les bons chiffres, au bon moment.
          </h2>
          <p className="section-copy mt-5">
            Plus besoin d’attendre la fin du mois pour savoir où vous en êtes.
            AFRICRM Shop transforme vos opérations quotidiennes en informations
            faciles à comprendre.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Suivez vos ventes et vos marges en temps réel",
              "Repérez immédiatement les produits à réapprovisionner",
              "Comparez les performances de vos points de vente",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm font-medium"
              >
                <span className="text-brand mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#e5f4eb]">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section id="solutions" className="bg-[#092f22] py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12 xl:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="section-eyebrow text-[#79d4a2]">
              Une solution qui évolue
            </p>
            <h2 className="section-title mt-4 text-white">
              À chaque commerce, son rythme.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/55">
            Commencez simplement, puis activez les capacités dont votre équipe a
            besoin au fil de votre croissance.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {audiences.map(([Icon, label, title, description]) => (
            <article
              key={label}
              className="rounded-3xl border border-white/10 bg-white/5 p-7 transition hover:bg-white/8"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/8 text-[#79d4a2]">
                  <Icon className="size-5" />
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-white/45 uppercase">
                  {label}
                </span>
              </div>
              <h3 className="mt-9 text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        <div className="text-center">
          <p className="section-eyebrow">Questions fréquentes</p>
          <h2 className="section-title mt-4">Vous vous posez la question ?</h2>
        </div>
        <div className="divide-border border-border mt-12 divide-y border-y">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-2 text-left font-bold">
                {question}
                <span className="border-border grid size-8 shrink-0 place-items-center rounded-full border text-lg font-light transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="text-muted max-w-2xl pt-2 pr-12 text-sm leading-7">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaAndFooter() {
  return (
    <>
      <section id="acces" className="bg-white px-6 py-20 sm:px-10 sm:py-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#0a3827] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div className="absolute -top-24 -left-20 size-72 rounded-full bg-[#1c8e5d]/30 blur-3xl" />
          <div className="bg-accent/15 absolute -right-12 -bottom-24 size-72 rounded-full blur-3xl" />
          <div className="relative mx-auto max-w-3xl">
            <span className="text-accent mx-auto grid size-14 place-items-center rounded-2xl bg-white/10">
              <Store className="size-6" />
            </span>
            <h2 className="mt-7 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Construisons la caisse qui vous ressemble.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60">
              AFRICRM Shop est en cours de développement. Rejoignez les premiers
              commerces accompagnés et aidez-nous à façonner le produit.
            </p>
            <a
              href="mailto:contact@africrm.com?subject=Accès anticipé AFRICRM Shop"
              className="group mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0a3827] transition hover:-translate-y-0.5"
            >
              Parler à notre équipe
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-border border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 lg:px-12 xl:px-6">
          <div className="flex flex-col justify-between gap-10 sm:flex-row">
            <div>
              <Logo />
              <p className="text-muted mt-4 max-w-xs text-sm leading-6">
                Des solutions numériques de qualité internationale, conçues au
                Sénégal pour les entreprises africaines.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-14 gap-y-8 text-sm">
              <div>
                <p className="mb-4 font-bold">Produit</p>
                <div className="text-muted space-y-3">
                  <a className="hover:text-brand block" href="#fonctionnalites">
                    Fonctionnalités
                  </a>
                  <a className="hover:text-brand block" href="#solutions">
                    Solutions
                  </a>
                  <a className="hover:text-brand block" href="#acces">
                    Accès anticipé
                  </a>
                </div>
              </div>
              <div>
                <p className="mb-4 font-bold">Entreprise</p>
                <div className="text-muted space-y-3">
                  <span className="block">Dakar, Sénégal</span>
                  <a
                    className="hover:text-brand block"
                    href="mailto:contact@africrm.com"
                  >
                    Nous contacter
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-border text-muted mt-12 flex flex-col justify-between gap-3 border-t pt-6 text-xs sm:flex-row">
            <span>© 2026 AFRICRM. Tous droits réservés.</span>
            <span>Conçu avec exigence à Dakar.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export function LandingSections() {
  return (
    <>
      <FeatureSection />
      <AnalyticsSection />
      <AudienceSection />
      <FaqSection />
      <CtaAndFooter />
    </>
  );
}
