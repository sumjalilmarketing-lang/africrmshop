import type {
  OwnerNotificationPriority,
  OwnerNotificationType,
} from "@/lib/owner-notifications";

export type OwnerNotificationsSummaryInput = {
  type: OwnerNotificationType;
  priority: OwnerNotificationPriority;
  amount: number | null;
  isRead: boolean;
};

export type OwnerNotificationsSummary = {
  notificationCount: number;
  unreadCount: number;
  readCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  exposedAmount: number;
  actionRequiredCount: number;
  treatmentRate: number;
};

export function buildOwnerNotificationsSummary(
  notifications: OwnerNotificationsSummaryInput[],
): OwnerNotificationsSummary {
  const summary = notifications.reduce<OwnerNotificationsSummary>(
    (accumulator, notification) => {
      if (notification.isRead) {
        accumulator.readCount += 1;
      } else {
        accumulator.unreadCount += 1;
      }

      if (notification.priority === "high") {
        accumulator.highCount += 1;
      }

      if (notification.priority === "medium") {
        accumulator.mediumCount += 1;
      }

      if (notification.priority === "low") {
        accumulator.lowCount += 1;
      }

      if (!notification.isRead && notification.priority !== "low") {
        accumulator.actionRequiredCount += 1;
      }

      accumulator.exposedAmount += Math.abs(notification.amount ?? 0);

      return accumulator;
    },
    {
      notificationCount: notifications.length,
      unreadCount: 0,
      readCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      exposedAmount: 0,
      actionRequiredCount: 0,
      treatmentRate: 0,
    },
  );

  summary.treatmentRate =
    summary.notificationCount === 0
      ? 100
      : Math.round((summary.readCount / summary.notificationCount) * 100);

  return summary;
}
