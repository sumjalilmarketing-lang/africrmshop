import {
  ArrowRight,
  Check,
  ChevronRight,
  Cloud,
  Headphones,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/header";
import { LandingSections } from "@/components/landing/sections";
import { ProductPreview } from "@/components/landing/product-preview";

const promises = [
  "Simple à prendre en main",
  "Adapté au mobile",
  "Données protégées",
];

const highlights = [
  [Smartphone, "Partout", "Ordinateur, tablette et mobile"],
  [Zap, "Rapide", "Conçu pour les heures de pointe"],
  [Cloud, "Synchronisé", "Vos données toujours accessibles"],
  [Headphones, "Proche", "Une équipe qui vous comprend"],
] as const;

export default function Home() {
  return (
    <main className="overflow-hidden">
      <section className="relative bg-[#062d1f] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-28 left-[8%] size-80 rounded-full bg-[#157d51]/25 blur-[100px]" />
          <div className="absolute right-[8%] bottom-0 size-[420px] rounded-full bg-[#d8a52c]/12 blur-[120px]" />
          <div className="hero-grid absolute inset-0 opacity-35" />
        </div>

        <LandingHeader />

        <div className="relative mx-auto grid min-h-[780px] max-w-7xl items-center gap-16 px-6 pt-28 pb-20 sm:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:pt-32 xl:px-6">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-xs font-semibold text-[#cce8d8] backdrop-blur">
              <Sparkles className="text-accent size-3.5" />
              La nouvelle génération de caisse arrive
            </div>
            <h1 className="text-5xl leading-[0.98] font-bold tracking-[-0.05em] sm:text-6xl lg:text-[4.6rem]">
              Vendez mieux.{" "}
              <span className="text-[#79d4a2]">Gérez simplement.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/68 sm:text-xl">
              AFRICRM Shop réunit la caisse, le stock, les clients et vos
              indicateurs dans une expérience rapide, claire et pensée pour les
              commerces africains.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#acces"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0a3827] shadow-xl shadow-black/10 transition hover:-translate-y-0.5"
              >
                Demander un accès anticipé
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </a>
              <a
                href="#fonctionnalites"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/6 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Découvrir la solution
                <ChevronRight className="size-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-white/55">
              {promises.map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#79d4a2]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-border border-b bg-white">
        <div className="divide-border mx-auto grid max-w-7xl grid-cols-2 divide-x px-6 py-7 sm:px-10 md:grid-cols-4 lg:px-12 xl:px-6">
          {highlights.map(([Icon, title, text], index) => (
            <div
              key={title}
              className={
                "px-4 py-4 sm:px-7 " +
                (index > 1 ? "border-border border-t md:border-t-0" : "")
              }
            >
              <Icon className="text-brand mb-3 size-5" />
              <p className="font-bold">{title}</p>
              <p className="text-muted mt-1 text-xs leading-5">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <LandingSections />
    </main>
  );
}
