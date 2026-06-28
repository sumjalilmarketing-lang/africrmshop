import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ notificationId: string }>;
};

type NotificationRow = {
  id: string;
  business_id: string;
  recipient_user_id: string | null;
};

const updateNotificationSchema = z.object({
  read: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { notificationId } = await context.params;
  const parsedNotificationId = z.uuid().safeParse(notificationId);
  if (!parsedNotificationId.success) {
    return NextResponse.json(
      { error: "Notification invalide." },
      { status: 400 },
    );
  }

  const parsed = updateNotificationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Action de notification invalide." },
      { status: 400 },
    );
  }

  const { data: notification, error: notificationError } = await supabaseAdmin
    .from("notifications")
    .select("id, business_id, recipient_user_id")
    .eq("id", parsedNotificationId.data)
    .maybeSingle();

  if (notificationError) {
    return NextResponse.json(
      { error: "La notification n'a pas pu être vérifiée." },
      { status: 500 },
    );
  }
  if (!notification) {
    return NextResponse.json(
      { error: "Notification introuvable." },
      { status: 404 },
    );
  }

  const notificationRow = notification as NotificationRow;
  const ownsBusiness = owner.ownerships.some(
    (ownership) => ownership.businessId === notificationRow.business_id,
  );
  const isRecipient =
    !notificationRow.recipient_user_id ||
    notificationRow.recipient_user_id === owner.profileId;

  if (!ownsBusiness || !isRecipient) {
    return NextResponse.json(
      { error: "Notification non autorisée." },
      { status: 403 },
    );
  }

  const readAt = parsed.data.read ? new Date().toISOString() : null;
  const { error: updateError } = await supabaseAdmin
    .from("notifications")
    .update({ read_at: readAt })
    .eq("id", parsedNotificationId.data);

  if (updateError) {
    return NextResponse.json(
      { error: "La notification n'a pas pu être mise à jour." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    notification: {
      id: parsedNotificationId.data,
      readAt,
      isRead: Boolean(readAt),
    },
  });
}
