import { describe, expect, it } from "vitest";
import {
  buildOwnerNotifications,
  mergeOwnerNotifications,
  normalizePersistedNotifications,
} from "@/lib/owner-notifications";

describe("buildOwnerNotifications", () => {
  it("creates high and medium notifications from risk alerts", () => {
    const notifications = buildOwnerNotifications({
      today: "2026-06-28",
      riskAlerts: [
        {
          id: "risk-1",
          type: "cash_difference",
          severity: "high",
          businessId: "business-1",
          storeId: "store-1",
          sourceId: "session-1",
          sourceLabel: "Session caisse",
          title: "Écart de caisse détecté",
          description: "Contrôle nécessaire",
          amount: -15_000,
          quantity: null,
          occurredAt: "2026-06-27T22:00:00.000Z",
        },
        {
          id: "risk-2",
          type: "stock_adjustment",
          severity: "low",
          businessId: "business-1",
          storeId: "store-1",
          sourceId: "movement-1",
          sourceLabel: "Produit",
          title: "Signal faible",
          description: "Non critique",
          amount: null,
          quantity: 1,
          occurredAt: "2026-06-27T10:00:00.000Z",
        },
      ],
      expenses: [],
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "risk",
      priority: "high",
      actionHref: "/owner/risk-alerts",
      source: "computed",
      isRead: false,
      canMarkRead: false,
    });
  });

  it("creates notifications for pending, rejected and due expenses", () => {
    const notifications = buildOwnerNotifications({
      today: "2026-06-28",
      riskAlerts: [],
      expenses: [
        {
          id: "expense-1",
          businessId: "business-1",
          storeId: "store-1",
          expenseNumber: "DEP-001",
          status: "pending",
          totalAmount: 20_000,
          dueDate: "2026-07-01",
          createdAt: "2026-06-27T10:00:00.000Z",
          rejectionReason: null,
        },
        {
          id: "expense-2",
          businessId: "business-1",
          storeId: null,
          expenseNumber: "DEP-002",
          status: "rejected",
          totalAmount: 50_000,
          dueDate: null,
          createdAt: "2026-06-26T10:00:00.000Z",
          rejectionReason: "Justificatif invalide",
        },
        {
          id: "expense-3",
          businessId: "business-1",
          storeId: "store-1",
          expenseNumber: "DEP-003",
          status: "approved",
          totalAmount: 10_000,
          dueDate: "2026-06-20",
          createdAt: "2026-06-18T10:00:00.000Z",
          rejectionReason: null,
        },
      ],
    });

    expect(notifications.map((notification) => notification.type)).toEqual([
      "expense_rejected",
      "expense_due",
      "expense_due",
      "expense_pending",
    ]);
    expect(notifications[0]).toMatchObject({
      priority: "high",
      description: "Justificatif invalide",
    });
    expect(notifications[1]).toMatchObject({
      priority: "high",
      title: "Dépense en retard",
    });
  });

  it("normalizes persisted notifications with read state", () => {
    const notifications = normalizePersistedNotifications([
      {
        id: "notification-1",
        businessId: "business-1",
        recipientUserId: "user-1",
        title: "Paiement Wave reçu",
        body: "Un paiement doit être contrôlé.",
        category: "system",
        status: "unread",
        actionUrl: "/owner/sales",
        data: {
          priority: "high",
          store_id: "store-1",
          amount: 15_000,
        },
        readAt: null,
        createdAt: "2026-06-28T10:00:00.000Z",
      },
    ]);

    expect(notifications[0]).toMatchObject({
      id: "persisted:notification-1",
      persistedId: "notification-1",
      source: "persisted",
      type: "system",
      priority: "high",
      storeId: "store-1",
      amount: 15_000,
      isRead: false,
      canMarkRead: true,
    });
  });

  it("keeps persisted notifications over duplicated computed notifications", () => {
    const computed = buildOwnerNotifications({
      today: "2026-06-28",
      riskAlerts: [
        {
          id: "risk-1",
          type: "cash_difference",
          severity: "high",
          businessId: "business-1",
          storeId: "store-1",
          sourceId: "session-1",
          sourceLabel: "Session caisse",
          title: "Écart de caisse détecté",
          description: "Contrôle nécessaire",
          amount: -15_000,
          quantity: null,
          occurredAt: "2026-06-27T22:00:00.000Z",
        },
      ],
      expenses: [],
    });

    const merged = mergeOwnerNotifications({
      computed,
      persisted: [
        {
          id: "notification-1",
          businessId: "business-1",
          recipientUserId: null,
          title: "Écart persisté",
          body: "Déjà enregistré.",
          category: "risk",
          status: "read",
          actionUrl: "/owner/risk-alerts",
          data: {
            computed_id: "risk:risk-1",
            priority: "high",
          },
          readAt: "2026-06-28T09:00:00.000Z",
          createdAt: "2026-06-28T08:00:00.000Z",
        },
      ],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      source: "persisted",
      title: "Écart persisté",
      isRead: true,
    });
  });
});
