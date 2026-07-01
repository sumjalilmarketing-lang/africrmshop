import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const notificationsQuery = {
    insert: vi.fn(),
  };

  return {
    getOwnerSession: vi.fn(),
    getOwnerNotificationsData: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "notifications") return notificationsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    notificationsQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getOwnerSession: mocks.getOwnerSession }));
vi.mock("@/lib/owner-notifications-data", () => ({
  getOwnerNotificationsData: mocks.getOwnerNotificationsData,
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { POST } from "./route";

const owner = {
  profileId: "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9",
  mustChangePassword: false,
  ownerships: [{ businessId: "66002ddd-634b-4c09-970b-0a50ac451484" }],
};

const computedNotification = {
  id: "risk:risk-1",
  persistedId: null,
  source: "computed",
  type: "risk",
  priority: "high",
  businessId: "66002ddd-634b-4c09-970b-0a50ac451484",
  storeId: "87002ddd-634b-4c09-970b-0a50ac451484",
  title: "Écart de caisse détecté",
  description: "Contrôle nécessaire.",
  amount: -15_000,
  occurredAt: "2026-06-28T10:00:00.000Z",
  actionHref: "/owner/risk-alerts",
  actionLabel: "Contrôler",
  isRead: false,
  canMarkRead: false,
} as const;

describe("POST /api/owner/notifications/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue(owner);
    mocks.getOwnerNotificationsData.mockResolvedValue({
      computedNotifications: [computedNotification],
      persistedNotifications: [],
    });
    mocks.notificationsQuery.insert.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it("refuse les utilisateurs non connectés", async () => {
    mocks.getOwnerSession.mockResolvedValueOnce(null);

    const response = await POST();

    expect(response.status).toBe(403);
    expect(mocks.notificationsQuery.insert).not.toHaveBeenCalled();
  });

  it("persiste les notifications calculées manquantes", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ synced: 1, skipped: 0 });
    expect(mocks.notificationsQuery.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        business_id: computedNotification.businessId,
        recipient_user_id: owner.profileId,
        title: computedNotification.title,
        category: computedNotification.type,
        status: "unread",
        action_url: computedNotification.actionHref,
        data: expect.objectContaining({
          computed_id: computedNotification.id,
          priority: computedNotification.priority,
        }),
      }),
    ]);
  });

  it("ignore les notifications déjà synchronisées", async () => {
    mocks.getOwnerNotificationsData.mockResolvedValueOnce({
      computedNotifications: [computedNotification],
      persistedNotifications: [
        {
          id: "notification-1",
          businessId: computedNotification.businessId,
          recipientUserId: owner.profileId,
          title: computedNotification.title,
          body: computedNotification.description,
          category: "risk",
          status: "unread",
          actionUrl: "/owner/risk-alerts",
          data: { computed_id: computedNotification.id },
          readAt: null,
          createdAt: "2026-06-28T10:10:00.000Z",
        },
      ],
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ synced: 0, skipped: 1 });
    expect(mocks.notificationsQuery.insert).not.toHaveBeenCalled();
  });
});
