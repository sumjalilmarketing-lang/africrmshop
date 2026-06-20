import { CheckCircle2, Database, ShieldCheck, XCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

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

async function runDiagnostic() {
  const [adminCheck, publicCheck, tableChecks] = await Promise.all([
    supabaseAdmin
      .from("businesses")
      .select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("id").limit(1),
    Promise.all(
      expectedPublicTables.map(async (tableName) => {
        const { error } = await supabaseAdmin
          .from(tableName)
          .select("*", { head: true })
          .limit(1);

        return { tableName, error };
      }),
    ),
  ]);

  const detectedTables = tableChecks
    .filter(({ error }) => !error)
    .map(({ tableName }) => tableName);
  const missingTables = tableChecks
    .filter(({ error }) => Boolean(error))
    .map(({ tableName }) => tableName);

  const publicAccessIsProtected =
    publicCheck.error?.code === "42501" ||
    publicCheck.error?.message.toLowerCase().includes("permission denied") ===
      true;
  const publicClientIsValid = !publicCheck.error || publicAccessIsProtected;
  const connectionWorks = !adminCheck.error && publicClientIsValid;

  return {
    connectionWorks,
    detectedTables,
    missingTables,
    publicAccessIsProtected,
    businessCount: adminCheck.count ?? 0,
    errorMessage:
      (adminCheck.status === 401
        ? "Les clés Supabase de .env.local sont absentes ou invalides."
        : adminCheck.error?.message) ||
      (publicClientIsValid ? null : publicCheck.error?.message) ||
      null,
  };
}

export default async function TestSupabasePage() {
  const diagnostic = await runDiagnostic();

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
            {diagnostic.connectionWorks ? (
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
                <p className="text-muted text-xs">Entreprises enregistrées</p>
                <p className="mt-1 text-xl font-bold">
                  {diagnostic.businessCount}
                </p>
              </div>
              <div className="border-border rounded-2xl border p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-brand size-4" />
                  <p className="text-xs font-bold">Accès public</p>
                </div>
                <p className="text-muted mt-1 text-xs">
                  {diagnostic.publicAccessIsProtected
                    ? "Protégé par les permissions Supabase"
                    : "Client public opérationnel"}
                </p>
              </div>
            </div>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">
                Tables publiques détectées
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
                Aucune table publique n’a été détectée.
              </p>
            )}

            {diagnostic.missingTables.length > 0 && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Tables prévues mais non détectées :{" "}
                {diagnostic.missingTables.join(", ")}.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
