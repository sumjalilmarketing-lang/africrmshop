"use client";

import {
  Banknote,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type PosCashSession = {
  id: string;
  businessId: string;
  storeId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: number;
  expectedClosingBalance: number | null;
  closingBalance: number | null;
  differenceAmount: number | null;
  notes: string | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-SN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "XOF",
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-SN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readApiPayload(response: Response) {
  return (await response.json().catch(() => null)) as {
    error?: string;
    cashSession?: PosCashSession;
  } | null;
}

export function CashSessionPanel({
  cashSession,
  storeId,
  storeName,
  onChanged,
}: Readonly<{
  cashSession: PosCashSession | null;
  storeId: string;
  storeName: string;
  onChanged: () => void;
}>) {
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "open" | "close") {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/pos/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "open"
          ? {
              action,
              storeId,
              openingBalance: Number(openingBalance || 0),
              notes: notes.trim() || undefined,
            }
          : {
              action,
              cashSessionId: cashSession?.id,
              closingBalance: Number(closingBalance || 0),
              notes: notes.trim() || undefined,
            },
      ),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response) {
      setError("Impossible de joindre le serveur de caisse.");
      return;
    }

    const payload = await readApiPayload(response);
    if (!response.ok || !payload?.cashSession) {
      setError(payload?.error ?? "L'opération de caisse a échoué.");
      return;
    }

    setNotes("");
    setClosingBalance("");
    setMessage(
      action === "open"
        ? "Session de caisse ouverte avec succès."
        : "Session de caisse fermée avec succès.",
    );
    onChanged();
  }

  const difference = cashSession?.differenceAmount;

  return (
    <section
      className={cn(
        "rounded-[2rem] border p-5 shadow-sm",
        cashSession
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-amber-100 bg-amber-50/70",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-12 place-items-center rounded-2xl",
              cashSession
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {cashSession ? (
              <UnlockKeyhole className="size-5" />
            ) : (
              <LockKeyhole className="size-5" />
            )}
          </span>
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-[#0b7a4b] uppercase">
              Session de caisse
            </p>
            <h2 className="mt-1 text-lg font-black">
              {cashSession ? "Caisse ouverte" : "Caisse fermée"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#68736c]">
              {cashSession
                ? `Ouverte le ${formatDateTime(cashSession.openedAt)} pour ${storeName}.`
                : `Ouvrez la caisse de ${storeName} avant tout encaissement.`}
            </p>
          </div>
        </div>

        {cashSession ? (
          <div className="grid gap-2 text-xs sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
              <p className="font-bold text-[#68736c]">Fonds initial</p>
              <p className="mt-1 font-black text-[#0b7a4b]">
                {formatMoney(cashSession.openingBalance)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
              <p className="font-bold text-[#68736c]">Attendu</p>
              <p className="mt-1 font-black text-[#0b7a4b]">
                {cashSession.expectedClosingBalance === null
                  ? "Recalculé à la clôture"
                  : formatMoney(cashSession.expectedClosingBalance)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
              <p className="font-bold text-[#68736c]">Écart</p>
              <p
                className={cn(
                  "mt-1 font-black",
                  !difference
                    ? "text-[#0b7a4b]"
                    : difference > 0
                      ? "text-amber-700"
                      : "text-red-700",
                )}
              >
                {difference === null || difference === undefined
                  ? "-"
                  : formatMoney(difference)}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        {cashSession ? (
          <>
            <label>
              <span className="text-xs font-black text-[#68736c]">
                Montant compté en caisse
              </span>
              <input
                value={closingBalance}
                onChange={(event) => setClosingBalance(event.target.value)}
                inputMode="numeric"
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe6df] bg-white px-4 text-sm font-bold outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                placeholder="Ex : 25000"
              />
            </label>
            <label>
              <span className="text-xs font-black text-[#68736c]">
                Note de fermeture
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe6df] bg-white px-4 text-sm font-bold outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                placeholder="Optionnel"
              />
            </label>
            <button
              type="button"
              onClick={() => submit("close")}
              disabled={isSubmitting || closingBalance.trim().length === 0}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#14251d] px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 lg:mt-auto"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Banknote className="size-4" />
              )}
              Fermer la caisse
            </button>
          </>
        ) : (
          <>
            <label>
              <span className="text-xs font-black text-[#68736c]">
                Fonds initial
              </span>
              <input
                value={openingBalance}
                onChange={(event) => setOpeningBalance(event.target.value)}
                inputMode="numeric"
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe6df] bg-white px-4 text-sm font-bold outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                placeholder="Ex : 10000"
              />
            </label>
            <label>
              <span className="text-xs font-black text-[#68736c]">
                Note d&apos;ouverture
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe6df] bg-white px-4 text-sm font-bold outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
                placeholder="Optionnel"
              />
            </label>
            <button
              type="button"
              onClick={() => submit("open")}
              disabled={isSubmitting || !storeId}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45 lg:mt-auto"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Ouvrir la caisse
            </button>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-xs font-bold text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
