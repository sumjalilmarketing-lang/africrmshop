"use client";

import {
  BarChart3,
  Bell,
  Building2,
  BookOpenCheck,
  Boxes,
  ClipboardList,
  ContactRound,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/landing/logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

const navigation = [
  [LayoutDashboard, "Dashboard", "/owner/dashboard"],
  [Bell, "Notifications", "/owner/notifications"],
  [Building2, "Entreprises", "/owner/businesses"],
  [Store, "Boutiques", "/owner/stores"],
  [Package, "Produits", "/owner/products"],
  [Boxes, "Inventaire", "/owner/inventory"],
  [Truck, "Fournisseurs", "/owner/suppliers"],
  [ContactRound, "Clients", "/owner/customers"],
  [Users, "Employés", "/owner/employees"],
  [ShoppingCart, "Caisse POS", "/pos"],
  [ReceiptText, "Ventes", "/owner/sales"],
  [ClipboardList, "Rapports caisse", "/owner/cash-reports"],
  [BarChart3, "Finances", "/owner/financial-reports"],
  [Landmark, "TVA / Fiscalité", "/owner/tax-reports"],
  [ShieldAlert, "Contrôle", "/owner/risk-alerts"],
  [BookOpenCheck, "Comptabilité", "/owner/accounting"],
  [FileText, "Dépenses", "/owner/expenses"],
  [Settings, "Paramètres", "/owner/settings"],
] as const;

export function OwnerShell({
  user,
  children,
}: Readonly<{
  user: { displayName: string; email: string | null };
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-[#14251d]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#e1e7e3] bg-white p-5 lg:flex lg:flex-col">
        <Logo />
        <div className="mt-8 rounded-2xl bg-[#f3f7f4] p-3">
          <p className="truncate text-xs font-bold">{user.displayName}</p>
          <p className="text-muted mt-1 truncate text-[10px]">
            {user.email ?? "Propriétaire"}
          </p>
        </div>
        <nav className="mt-7 flex-1 space-y-1">
          {navigation.map(([Icon, label, href]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold transition",
                  active
                    ? "bg-[#e9f5ee] text-[#0b7a4b]"
                    : "text-muted hover:bg-[#f5f7f5] hover:text-[#14251d]",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="text-muted flex items-center gap-3 rounded-xl border border-[#e1e7e3] px-3 py-3 text-xs font-bold hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="size-4" /> Déconnexion
        </button>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e1e7e3] bg-white/90 px-5 backdrop-blur lg:px-8">
          <p className="text-xs font-bold text-[#0b7a4b]">
            Espace propriétaire
          </p>
          <Link
            href="/owner/businesses/new"
            className="rounded-xl bg-[#0b7a4b] px-4 py-2.5 text-xs font-bold text-white"
          >
            Nouvelle entreprise
          </Link>
        </header>
        <main className="px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
