import type { RiskAlert } from "@/lib/owner-risk-alerts";

export type OwnerNotificationPriority = "low" | "medium" | "high";

export type OwnerNotificationType =
  | "risk"
  | "expense_due"
  | "expense_pending"
  | "expense_rejected"
  | "system"
  | "other";

export type OwnerNotificationSource = "computed" | "persisted";

export type NotificationExpenseInput = {
  id: string;
  businessId: string;
  storeId: string | null;
  expenseNumber: string;
  status: string;
  totalAmount: number;
  dueDate: string | null;
  createdAt: string;
  rejectionReason: string | null;
};

export type OwnerNotification = {
  id: string;
  persistedId: string | null;
  source: OwnerNotificationSource;
  type: OwnerNotificationType;
  priority: OwnerNotificationPriority;
  businessId: string;
  storeId: string | null;
  title: string;
  description: string;
  amount: number | null;
  occurredAt: string;
  actionHref: string;
  actionLabel: string;
  isRead: boolean;
  canMarkRead: boolean;
};

export type PersistedNotificationInput = {
  id: string;
  businessId: string;
  recipientUserId: string | null;
  title: string;
  body: string;
  category: string;
  status: string;
  actionUrl: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

function getPriorityFromRisk(severity: RiskAlert["severity"]) {
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";

  return "low";
}

function isDueSoon(input: { dueDate: string; today: string }) {
  const dueTime = new Date(`${input.dueDate}T00:00:00`).getTime();
  const todayTime = new Date(`${input.today}T00:00:00`).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return dueTime <= todayTime + sevenDays;
}

export function buildOwnerNotifications(input: {
  riskAlerts: RiskAlert[];
  expenses: NotificationExpenseInput[];
  today: string;
}) {
  const notifications: OwnerNotification[] = [];

  for (const alert of input.riskAlerts) {
    if (alert.severity === "low") continue;

    notifications.push({
      id: `risk:${alert.id}`,
      persistedId: null,
      source: "computed",
      type: "risk",
      priority: getPriorityFromRisk(alert.severity),
      businessId: alert.businessId,
      storeId: alert.storeId,
      title: alert.title,
      description: alert.description,
      amount: alert.amount,
      occurredAt: alert.occurredAt,
      actionHref: "/owner/risk-alerts",
      actionLabel: "Contrôler",
      isRead: false,
      canMarkRead: false,
    });
  }

  for (const expense of input.expenses) {
    if (expense.status === "pending") {
      notifications.push({
        id: `expense-pending:${expense.id}`,
        persistedId: null,
        source: "computed",
        type: "expense_pending",
        priority: "medium",
        businessId: expense.businessId,
        storeId: expense.storeId,
        title: "Dépense en attente de validation",
        description: `${expense.expenseNumber} doit être contrôlée avant paiement ou comptabilisation.`,
        amount: expense.totalAmount,
        occurredAt: expense.createdAt,
        actionHref: "/owner/expenses",
        actionLabel: "Voir la dépense",
        isRead: false,
        canMarkRead: false,
      });
    }

    if (expense.status === "rejected") {
      notifications.push({
        id: `expense-rejected:${expense.id}`,
        persistedId: null,
        source: "computed",
        type: "expense_rejected",
        priority: "high",
        businessId: expense.businessId,
        storeId: expense.storeId,
        title: "Dépense rejetée",
        description:
          expense.rejectionReason ??
          `${expense.expenseNumber} a été rejetée et nécessite une correction.`,
        amount: expense.totalAmount,
        occurredAt: expense.createdAt,
        actionHref: "/owner/expenses",
        actionLabel: "Corriger",
        isRead: false,
        canMarkRead: false,
      });
    }

    if (
      expense.dueDate &&
      !["paid", "cancelled", "rejected"].includes(expense.status) &&
      isDueSoon({ dueDate: expense.dueDate, today: input.today })
    ) {
      notifications.push({
        id: `expense-due:${expense.id}`,
        persistedId: null,
        source: "computed",
        type: "expense_due",
        priority: expense.dueDate < input.today ? "high" : "medium",
        businessId: expense.businessId,
        storeId: expense.storeId,
        title:
          expense.dueDate < input.today
            ? "Dépense en retard"
            : "Dépense bientôt exigible",
        description: `${expense.expenseNumber} arrive à échéance le ${expense.dueDate}.`,
        amount: expense.totalAmount,
        occurredAt: expense.dueDate,
        actionHref: "/owner/expenses",
        actionLabel: "Traiter",
        isRead: false,
        canMarkRead: false,
      });
    }
  }

  return sortOwnerNotifications(notifications);
}

function getNotificationType(category: string): OwnerNotificationType {
  if (
    category === "risk" ||
    category === "expense_due" ||
    category === "expense_pending" ||
    category === "expense_rejected" ||
    category === "system"
  ) {
    return category;
  }

  return "other";
}

function getNotificationPriority(
  data: Record<string, unknown> | null,
): OwnerNotificationPriority {
  const priority = data?.priority;
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  return "medium";
}

function getStoreId(data: Record<string, unknown> | null) {
  const storeId = data?.store_id ?? data?.storeId;

  return typeof storeId === "string" ? storeId : null;
}

function getAmount(data: Record<string, unknown> | null) {
  const amount = data?.amount;

  return typeof amount === "number" ? amount : null;
}

function getComputedId(data: Record<string, unknown> | null) {
  const computedId = data?.computed_id ?? data?.computedId;

  return typeof computedId === "string" ? computedId : null;
}

function sortOwnerNotifications(notifications: OwnerNotification[]) {
  return notifications.sort((first, second) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff =
      priorityOrder[second.priority] - priorityOrder[first.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return second.occurredAt.localeCompare(first.occurredAt);
  });
}

export function normalizePersistedNotifications(
  notifications: PersistedNotificationInput[],
) {
  return notifications.map(
    (notification): OwnerNotification => ({
      id: `persisted:${notification.id}`,
      persistedId: notification.id,
      source: "persisted",
      type: getNotificationType(notification.category),
      priority: getNotificationPriority(notification.data),
      businessId: notification.businessId,
      storeId: getStoreId(notification.data),
      title: notification.title,
      description: notification.body,
      amount: getAmount(notification.data),
      occurredAt: notification.createdAt,
      actionHref: notification.actionUrl ?? "/owner/notifications",
      actionLabel: "Ouvrir",
      isRead: Boolean(notification.readAt) || notification.status === "read",
      canMarkRead: true,
    }),
  );
}

export function mergeOwnerNotifications(input: {
  computed: OwnerNotification[];
  persisted: PersistedNotificationInput[];
}) {
  const persistedNotifications = normalizePersistedNotifications(
    input.persisted,
  );
  const persistedComputedIds = new Set(
    input.persisted
      .map((notification) => getComputedId(notification.data))
      .filter((id): id is string => Boolean(id)),
  );
  const computedNotifications = input.computed.filter(
    (notification) => !persistedComputedIds.has(notification.id),
  );

  return sortOwnerNotifications([
    ...persistedNotifications,
    ...computedNotifications,
  ]);
}
