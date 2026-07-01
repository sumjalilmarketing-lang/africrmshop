import { NextResponse } from "next/server";
import { getOwnerSession } from "@/lib/auth";
import type { OwnerNotification } from "@/lib/owner-notifications";
import { getOwnerNotificationsData } from "@/lib/owner-notifications-data";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getComputedId(data: Record<string, unknown> | null) {
  const computedId = data?.computed_id ?? data?.computedId;

  return typeof computedId === "string" ? computedId : null;
}

function toNotificationInsert(
  ownerProfileId: string,
  notification: OwnerNotification,
) {
  return {
    business_id: notification.businessId,
    recipient_user_id: ownerProfileId,
    title: notification.title,
    body: notification.description,
    category: notification.type,
    status: "unread",
    action_url: notification.actionHref,
    data: {
      computed_id: notification.id,
      priority: notification.priority,
      store_id: notification.storeId,
      amount: notification.amount,
      source: "owner_notification_sync",
      synced_at: new Date().toISOString(),
    },
  };
}

export async function POST() {
  const owner = await getOwnerSession();
  if (!owner || owner.mustChangePassword) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { computedNotifications, persistedNotifications } =
    await getOwnerNotificationsData(owner);
  const existingComputedIds = new Set(
    persistedNotifications
      .map((notification) => getComputedId(notification.data))
      .filter((id): id is string => Boolean(id)),
  );
  const notificationsToPersist = computedNotifications
    .filter((notification) => !existingComputedIds.has(notification.id))
    .slice(0, 100);

  if (!notificationsToPersist.length) {
    return NextResponse.json({
      synced: 0,
      skipped: computedNotifications.length,
    });
  }

  const { error } = await supabaseAdmin
    .from("notifications")
    .insert(
      notificationsToPersist.map((notification) =>
        toNotificationInsert(owner.profileId, notification),
      ),
    );

  if (error) {
    return NextResponse.json(
      { error: "Les notifications n'ont pas pu être synchronisées." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    synced: notificationsToPersist.length,
    skipped: computedNotifications.length - notificationsToPersist.length,
  });
}
