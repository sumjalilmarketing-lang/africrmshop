"use client";

import {
  ArrowDown,
  ArrowUp,
  Banknote,
  CheckCircle2,
  ClipboardList,
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

export type PosCashMovement = {
  id: string;
  businessId: string;
  cashSessionId: string;
  movementType: string;
  amount: number;
  reason: string;
  performedBy: string | null;
  createdAt: string;
};

export type PosCashReport = {
  cashSessionId: string;
  openingBalance: number;
  cashSalesTotal: number;
  mobileMoneyTotal: number;
  manualCashInTotal: number;
  manualCashOutTotal: number;
  expectedCashBalance: number;
  salesCount: number;
  movementCount: number;
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
    cashMovement?: PosCashMovement;
  } | null;
}

export function CashSessionPanel({
  cashSession,
  cashMovements,
  cashReport,
  storeId,
  storeName,
  onChanged,
}: Readonly<{
  cashSession: PosCashSession | null;
  cashMovements: PosCashMovement[];
  cashReport: PosCashReport | null;
  storeId: string;
  storeName: string;
  onChanged: () => void;
}>) {
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [movementType, setMovementType] = useState<"cash_in" | "cash_out">(
    "cash_in",
  );
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMovementSubmitting, setIsMovementSubmitting] = useState(false);
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

  async function submitMovement() {
    if (!cashSession || isMovementSubmitting) return;

    setIsMovementSubmitting(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/pos/cash-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cashSessionId: cashSession.id,
        movementType,
        amount: Number(movementAmount || 0),
        reason: movementReason.trim(),
      }),
    }).catch(() => null);

    setIsMovementSubmitting(false);

    if (!response) {
      setError("Impossible de joindre le serveur de caisse.");
      return;
    }

    const payload = await readApiPayload(response);
    if (!response.ok || !payload?.cashMovement) {
      setError(payload?.error ?? "Le mouvement de caisse a échoué.");
      return;
    }

    setMovementAmount("");
    setMovementReason("");
    setMessage("Mouvement de caisse enregistré avec succès.");
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

      {!cashSession ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {[
            [
              "POS 15 · Mouvements",
              "Les entrées et sorties seront disponibles dès l'ouverture de caisse.",
            ],
            [
              "POS 16 · Rapport X",
              "Le rapport de caisse sera calculé en temps réel après ouverture.",
            ],
          ].map(([title, description]) => (
            <section
              key={title}
              className="rounded-3xl border border-dashed border-amber-200 bg-white/70 p-4"
            >
              <p className="text-xs font-black tracking-[0.16em] text-amber-700 uppercase">
                {title}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#68736c]">
                {description}
              </p>
            </section>
          ))}
        </div>
      ) : null}

      {cashSession && cashReport ? (
        <section className="mt-5 rounded-3xl border border-[#dbe6df] bg-white/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[#0b7a4b] uppercase">
                POS 16 · Rapport X
              </p>
              <h3 className="mt-1 text-base font-black">
                Situation de caisse en temps réel
              </h3>
            </div>
            <ClipboardList className="size-5 text-[#0b7a4b]" />
          </div>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-[#f8fbf9] p-3">
              <p className="font-bold text-[#68736c]">Ventes cash</p>
              <p className="mt-1 font-black text-[#0b7a4b]">
                {formatMoney(cashReport.cashSalesTotal)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fbf9] p-3">
              <p className="font-bold text-[#68736c]">Entrées manuelles</p>
              <p className="mt-1 font-black text-emerald-700">
                {formatMoney(cashReport.manualCashInTotal)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fbf9] p-3">
              <p className="font-bold text-[#68736c]">Sorties manuelles</p>
              <p className="mt-1 font-black text-red-700">
                {formatMoney(cashReport.manualCashOutTotal)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fbf9] p-3">
              <p className="font-bold text-[#68736c]">Cash attendu</p>
              <p className="mt-1 font-black text-[#0b7a4b]">
                {formatMoney(cashReport.expectedCashBalance)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#68736c]">
            {cashReport.salesCount} vente(s), {cashReport.movementCount}{" "}
            mouvement(s), {formatMoney(cashReport.mobileMoneyTotal)} encaissé(s)
            hors espèces.
          </p>
        </section>
      ) : null}

      {cashSession ? (
        <section className="mt-5 rounded-3xl border border-[#dbe6df] bg-white/85 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-[#0b7a4b] uppercase">
                POS 15 · Mouvements
              </p>
              <h3 className="mt-1 text-base font-black">
                Entrées et sorties de caisse
              </h3>
            </div>
            <Banknote className="size-5 text-[#0b7a4b]" />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1fr_1.4fr_auto]">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["cash_in", "Entrée", ArrowUp],
                ["cash_out", "Sortie", ArrowDown],
              ].map(([value, label, Icon]) => {
                const MovementIcon = Icon as typeof ArrowUp;
                return (
                  <button
                    key={value as string}
                    type="button"
                    onClick={() =>
                      setMovementType(value as "cash_in" | "cash_out")
                    }
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-black",
                      movementType === value
                        ? "border-[#0b7a4b] bg-[#e9f5ee] text-[#0b7a4b]"
                        : "border-[#dbe6df] text-[#68736c]",
                    )}
                  >
                    <MovementIcon className="size-4" />
                    {label as string}
                  </button>
                );
              })}
            </div>
            <input
              value={movementAmount}
              onChange={(event) => setMovementAmount(event.target.value)}
              inputMode="numeric"
              className="h-12 rounded-2xl border border-[#dbe6df] bg-white px-4 text-sm font-bold outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
              placeholder="Montant"
            />
            <input
              value={movementReason}
              onChange={(event) => setMovementReason(event.target.value)}
              className="h-12 rounded-2xl border border-[#dbe6df] bg-white px-4 text-sm font-bold outline-none focus:border-[#0b7a4b] focus:ring-4 focus:ring-[#0b7a4b]/10"
              placeholder="Motif obligatoire"
            />
            <button
              type="button"
              onClick={submitMovement}
              disabled={
                isMovementSubmitting ||
                Number(movementAmount || 0) <= 0 ||
                movementReason.trim().length < 3
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0b7a4b] px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isMovementSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Ajouter
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {cashMovements.length > 0 ? (
              cashMovements.slice(0, 6).map((movement) => {
                const isIn = ["cash_in", "deposit"].includes(
                  movement.movementType,
                );

                return (
                  <article
                    key={movement.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#edf0ee] bg-[#f8fbf9] px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-black">{movement.reason}</p>
                      <p className="mt-0.5 text-[10px] text-[#68736c]">
                        {formatDateTime(movement.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-black",
                        isIn ? "text-emerald-700" : "text-red-700",
                      )}
                    >
                      {isIn ? "+" : "-"}
                      {formatMoney(movement.amount)}
                    </span>
                  </article>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-[#dbe6df] bg-[#f8fbf9] px-4 py-5 text-center text-xs text-[#68736c]">
                Aucun mouvement manuel pour cette session.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
