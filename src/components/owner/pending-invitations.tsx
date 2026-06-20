"use client";

import { LoaderCircle, Mail, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type PendingInvitation = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  businessName: string;
  storeName: string;
  roleName: string;
  expiresAt: string;
};

export function PendingInvitations({
  invitations,
}: Readonly<{ invitations: PendingInvitation[] }>) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function revoke(invitationId: string) {
    setRevokingId(invitationId);
    const response = await fetch("/api/owner/employee-invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setRevokingId(null);
    if (!response.ok) {
      toast.error(result?.error ?? "La révocation a échoué.");
      return;
    }
    toast.success("Invitation révoquée");
    router.refresh();
  }

  if (!invitations.length) return null;

  return (
    <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
      <h2 className="text-sm font-bold">Invitations en attente</h2>
      <div className="mt-4 grid gap-3">
        {invitations.map((invitation) => (
          <article
            key={invitation.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {[invitation.firstName, invitation.lastName]
                    .filter(Boolean)
                    .join(" ") || invitation.email}
                </p>
                <p className="text-muted mt-1 truncate text-[10px]">
                  {invitation.email} · {invitation.roleName} ·{" "}
                  {invitation.storeName}
                </p>
                <p className="text-muted mt-1 text-[10px]">
                  {invitation.businessName} · expire le{" "}
                  {new Intl.DateTimeFormat("fr-SN").format(
                    new Date(invitation.expiresAt),
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={revokingId === invitation.id}
              onClick={() => revoke(invitation.id)}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-[10px] font-bold text-red-700 disabled:opacity-50"
            >
              {revokingId === invitation.id ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              Révoquer
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
