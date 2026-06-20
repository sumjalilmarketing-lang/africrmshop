import {
  BadgeCheck,
  Boxes,
  Cloud,
  CreditCard,
  LayoutDashboard,
  ScanBarcode,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Logo } from "./logo";

const products = [
  ["Riz parfumé", "7 500 F", "bg-[#fff1d8]", "🌾"],
  ["Huile 1 L", "1 500 F", "bg-[#e6f3e9]", "🫙"],
  ["Lait poudre", "2 500 F", "bg-[#e8effa]", "🥛"],
  ["Savon", "750 F", "bg-[#f4e9f5]", "🧼"],
];

const sales = [
  ["Riz parfumé 5 kg", "2 ×", "15 000 F"],
  ["Huile végétale 1 L", "1 ×", "1 500 F"],
  ["Lait en poudre", "2 ×", "5 000 F"],
];

export function ProductPreview() {
  return (
    <div
      id="produit"
      className="relative mx-auto w-full max-w-[680px] lg:ml-auto"
    >
      <div className="absolute -inset-8 rounded-[3rem] bg-white/8 blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#f8faf8] p-2 shadow-[0_35px_100px_rgba(2,24,15,0.45)] sm:p-3">
        <div className="flex items-center justify-between rounded-t-[1.2rem] bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#ff6b6b]" />
            <span className="size-2.5 rounded-full bg-[#ffd166]" />
            <span className="size-2.5 rounded-full bg-[#54c58b]" />
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#f1f5f2] px-3 py-1.5 text-[10px] font-semibold text-[#536159] sm:text-xs">
            <Cloud className="text-brand size-3.5" />
            Synchronisé
          </div>
        </div>

        <div className="grid min-h-[480px] grid-cols-[58px_1fr] overflow-hidden rounded-b-[1.2rem] bg-[#f1f4f1] sm:grid-cols-[78px_1fr]">
          <div className="flex flex-col items-center bg-[#0a3827] py-5 text-white">
            <Logo compact inverse />
            <div className="mt-10 space-y-3">
              {[LayoutDashboard, ShoppingBag, Boxes, Users].map(
                (Icon, index) => (
                  <div
                    key={Icon.displayName ?? index}
                    className={
                      "grid size-9 place-items-center rounded-xl sm:size-10 " +
                      (index === 1
                        ? "bg-white text-[#0a3827]"
                        : "text-white/55")
                    }
                  >
                    <Icon className="size-4" />
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-[1fr_210px] sm:p-4">
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-[#748078] sm:text-xs">
                    Vendredi 19 juin
                  </p>
                  <p className="text-sm font-bold text-[#17201b] sm:text-base">
                    Nouvelle vente
                  </p>
                </div>
                <span className="text-brand grid size-8 place-items-center rounded-full bg-[#e8efe9] text-xs font-bold">
                  AM
                </span>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 rounded-xl border border-[#e4e9e5] px-3 py-2.5 text-[10px] text-[#879189] sm:text-xs">
                  <ScanBarcode className="size-4" />
                  Scanner ou rechercher un produit...
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {products.map(([name, price, color, emoji]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-[#edf0ed] p-2.5"
                    >
                      <div
                        className={
                          "mb-2 grid h-11 place-items-center rounded-lg text-xl " +
                          color
                        }
                      >
                        {emoji}
                      </div>
                      <p className="truncate text-[10px] font-semibold text-[#29342d] sm:text-xs">
                        {name}
                      </p>
                      <p className="text-brand mt-0.5 text-[10px] font-bold sm:text-xs">
                        {price}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden flex-col rounded-2xl bg-white p-4 shadow-sm sm:flex">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#17201b]">Panier</p>
                <span className="text-brand rounded-full bg-[#ecf5ef] px-2 py-1 text-[10px] font-bold">
                  5 articles
                </span>
              </div>
              <div className="mt-4 flex-1 space-y-3">
                {sales.map(([name, quantity, price]) => (
                  <div key={name} className="border-b border-[#edf0ed] pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-[#354038]">
                        {name}
                      </p>
                      <p className="text-[11px] font-bold whitespace-nowrap text-[#17201b]">
                        {price}
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] text-[#879189]">
                      {quantity}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-[#dfe5e0] pt-3">
                <div className="flex items-end justify-between">
                  <p className="text-[11px] text-[#748078]">Total</p>
                  <p className="text-xl font-extrabold tracking-tight text-[#17201b]">
                    21 500 F
                  </p>
                </div>
                <button
                  type="button"
                  className="bg-brand mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white"
                >
                  <CreditCard className="size-3.5" />
                  Encaisser
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-3 -bottom-7 hidden items-center gap-3 rounded-2xl border border-white/70 bg-white p-3.5 text-[#17201b] shadow-2xl sm:flex">
        <span className="text-brand grid size-10 place-items-center rounded-xl bg-[#e9f6ee]">
          <BadgeCheck className="size-5" />
        </span>
        <div>
          <p className="text-muted text-[10px] font-medium">
            Vente enregistrée
          </p>
          <p className="text-xs font-bold">Stock mis à jour</p>
        </div>
      </div>
    </div>
  );
}
