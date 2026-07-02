import { describe, expect, it } from "vitest";
import { buildOwnerNotificationsSummary } from "@/lib/owner-notifications-summary";

describe("buildOwnerNotificationsSummary", () => {
  it("agrège les notifications owner par priorité, lecture et exposition", () => {
    const summary = buildOwnerNotificationsSummary([
      {
        type: "risk",
        priority: "high",
        amount: -25_000,
        isRead: false,
      },
      {
        type: "expense_pending",
        priority: "medium",
        amount: 12_500,
        isRead: false,
      },
      {
        type: "system",
        priority: "low",
        amount: null,
        isRead: false,
      },
      {
        type: "expense_due",
        priority: "high",
        amount: 7_500,
        isRead: true,
      },
    ]);

    expect(summary).toEqual({
      notificationCount: 4,
      unreadCount: 3,
      readCount: 1,
      highCount: 2,
      mediumCount: 1,
      lowCount: 1,
      exposedAmount: 45_000,
      actionRequiredCount: 2,
      treatmentRate: 25,
    });
  });

  it("retourne un taux de traitement complet sans notification", () => {
    expect(buildOwnerNotificationsSummary([])).toEqual({
      notificationCount: 0,
      unreadCount: 0,
      readCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      exposedAmount: 0,
      actionRequiredCount: 0,
      treatmentRate: 100,
    });
  });
});
