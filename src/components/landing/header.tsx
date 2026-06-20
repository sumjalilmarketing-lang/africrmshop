"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";

const links = [
  ["Produit", "#produit"],
  ["Fonctionnalités", "#fonctionnalites"],
  ["Solutions", "#solutions"],
];

export function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12 xl:px-6">
        <a href="#" aria-label="Accueil AFRICRM Shop">
          <Logo inverse />
        </a>

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/60 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="transition hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        <a
          href="/connexion"
          className="hidden rounded-xl border border-white/16 bg-white/8 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/12 md:inline-flex"
        >
          Mon entreprise
        </a>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="grid size-10 place-items-center rounded-xl border border-white/12 bg-white/8 text-white md:hidden"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isOpen && (
        <nav className="mx-4 rounded-2xl border border-white/12 bg-[#0b3b2a] p-3 shadow-2xl md:hidden">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/75 hover:bg-white/8 hover:text-white"
            >
              {label}
            </a>
          ))}
          <a
            href="/connexion"
            onClick={() => setIsOpen(false)}
            className="mt-2 block rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-[#0a3827]"
          >
            Mon entreprise
          </a>
        </nav>
      )}
    </header>
  );
}
