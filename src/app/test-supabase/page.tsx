"use client";

import { CheckCircle2, Database, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const expectedPublicTables = [
  "accounting_entries",
  "accounting_entry_lines",
  "activity_types",
  "audit_logs",
  "booking_status_history",
  "bookings",
  "business_settings",
  "business_owners",
  "business_subscriptions",
  "businesses",
  "cash_movements",
  "cash_sessions",
  "customer_notes",
  "customers",
  "employee_availability",
  "employee_invitations",
  "employees",
  "expense_documents",
  "expenses",
  "fraud_alerts",
  "notifications",
  "payment_methods",
  "payments",
  "permissions",
  "product_categories",
  "product_stock",
  "products",
  "qr_codes",
  "role_permissions",
  "roles",
  "sale_items",
  "sales",
  "services",
  "stock_movements",
  "stores",
  "subscription_plans",
  "suppliers",
  "tax_reports",
  "user_roles",
  "users",
  "whatsapp_messages",
] as const;

type Diagnostic = {
  businessCount: number | null;
  connectionWorks: boolean;
  detectedTables: string[];
  errorMessage: string | null;
  isLoading: boolean;
  publicAccessIsProtected: boolean;
};

const initialDiagnostic: Diagnostic = {
  businessCount: null,
  connectionWorks: false,
  detectedTables: [],
  errorMessage: null,
  isLoading: true,
  publicAccessIsProtected: false,
};

function isPermissionError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  );
}

export default function TestSupabasePage() {
  const [diagnostic, setDiagnostic] =
    useState<Diagnostic>(initialDiagnostic);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8_000);

    async function runDiagnostic() {
      const { data, error, count } = await supabase
        .from("businesses")
        .select("id", { count: "exact" })
        .limit(1)
        .abortSignal(controller.signal);

      const protectedByRls = isPermissionError(error);
      const connectionWorks = !error || protectedByRls;

      setDiagnostic({
        businessCount: count ?? data?.length ?? null,
        connectionWorks,
        detectedTables: connectionWorks ? [...expectedPublicTables] : [],
        errorMessage:
          error && !protectedByRls
            ? error.message
            : controller.signal.aborted
              ? "Supabase n’a pas répondu avant le délai de sécurité."
              : null,
        isLoading: false,
        publicAccessIsProtected: protectedByRls,
      });
    }

    runDiagnostic().catch((error: unknown) => {
      setDiagnostic({
        ...initialDiagnostic,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Erreur inconnue pendant le test Supabase.",
        isLoading: false,
      });
    });

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="border-border rounded-3xl border bg-white p-6 shadow-sm sm:p-10">
          <div className="flex items-center gap-3">
            <span className="text-brand grid size-12 place-items-center rounded-2xl bg-[#e9f5ee]">
              <Database className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-brand text-xs font-bold tracking-widest uppercase">
                Diagnostic temporaire
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Test de connexion Supabase
              </h1>
            </div>
          </div>

          <div className="border-border mt-8 rounded-2xl border bg-[#fafcfa] p-5">
            {diagnostic.isLoading ? (
              <div className="text-muted text-sm font-bold">
                Vérification de la connexion Supabase…
              </div>
            ) : diagnostic.connectionWorks ? (
              <div className="text-brand flex items-center gap-3 text-sm font-bold">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                Connexion Supabase réussie
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 text-sm font-bold text-red-600">
                  <XCircle className="size-5" aria-hidden="true" />
                  Erreur de connexion
                </div>
                {diagnostic.errorMessage && (
                  <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
                    {diagnostic.errorMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {diagnostic.connectionWorks && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="border-border rounded-2xl border p-4">
                <p className="text-muted text-xs">Entreprises accessibles</p>
                <p className="mt-1 text-xl font-bold">
                  {diagnostic.businessCount ?? "Protégé"}
                </p>
              </div>
              <div className="border-border rounded-2xl border p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-brand size-4" />
                  <p className="text-xs font-bold">Accès public</p>
                </div>
                <p className="text-muted mt-1 text-xs">
                  {diagnostic.publicAccessIsProtected
                    ? "Protégé par RLS / permissions Supabase"
                    : "Client public opérationnel"}
                </p>
              </div>
            </div>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">
                Tables publiques attendues
              </h2>
              <span className="text-brand rounded-full bg-[#e9f5ee] px-3 py-1 text-xs font-bold">
                {diagnostic.detectedTables.length}
              </span>
            </div>

            {diagnostic.detectedTables.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {diagnostic.detectedTables.map((tableName) => (
                  <li
                    key={tableName}
                    className="border-border text-foreground rounded-xl border bg-white px-4 py-3 font-mono text-xs"
                  >
                    {tableName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-4 text-sm">
                Les tables seront affichées après validation de la connexion.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
