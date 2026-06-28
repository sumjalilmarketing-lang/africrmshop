import type { RiskAlert } from "@/lib/owner-risk-alerts";

export type OwnerNotificationPriority = "low" | "medium" | "high";

export type OwnerNotificationType =
  | "risk"
  | "expense_due"
  | "expense_pending"
  | "expense_rejected";

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
    });
  }

  for (const expense of input.expenses) {
    if (expense.status === "pending") {
      notifications.push({
        id: `expense-pending:${expense.id}`,
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
      });
    }

    if (expense.status === "rejected") {
      notifications.push({
        id: `expense-rejected:${expense.id}`,
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
      });
    }

    if (
      expense.dueDate &&
      !["paid", "cancelled", "rejected"].includes(expense.status) &&
      isDueSoon({ dueDate: expense.dueDate, today: input.today })
    ) {
      notifications.push({
        id: `expense-due:${expense.id}`,
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
      });
    }
  }

  return notifications.sort((first, second) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff =
      priorityOrder[second.priority] - priorityOrder[first.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return second.occurredAt.localeCompare(first.occurredAt);
  });
}
