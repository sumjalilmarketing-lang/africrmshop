import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const notificationsQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    update: vi.fn(),
  };

  notificationsQuery.select.mockReturnValue(notificationsQuery);
  notificationsQuery.eq.mockReturnValue(notificationsQuery);
  notificationsQuery.update.mockReturnValue(notificationsQuery);

  return {
    getOwnerSession: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "notifications") return notificationsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
    notificationsQuery,
  };
});

vi.mock("@/lib/auth", () => ({ getOwnerSession: mocks.getOwnerSession }));
vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { PATCH } from "./route";

const businessId = "66002ddd-634b-4c09-970b-0a50ac451484";
const notificationId = "90000000-0000-4000-8000-000000000001";
const profileId = "4fa91dc1-7551-408c-bc6a-0fbbbab7a5c9";

function request(body: unknown) {
  return new Request(
    `http://localhost:3000/api/owner/notifications/${notificationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function context(id = notificationId) {
  return { params: Promise.resolve({ notificationId: id }) };
}

describe("PATCH /api/owner/notifications/[notificationId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId,
      mustChangePassword: false,
      ownerships: [{ businessId }],
    });
    mocks.notificationsQuery.maybeSingle.mockResolvedValue({
      data: {
        id: notificationId,
        business_id: businessId,
        recipient_user_id: profileId,
      },
      error: null,
    });
  });

  it("refuse une notification invalide", async () => {
    const response = await PATCH(request({ read: true }), context("bad"));

    expect(response.status).toBe(400);
    expect(mocks.notificationsQuery.update).not.toHaveBeenCalled();
  });

  it("refuse une notification d'une autre entreprise", async () => {
    mocks.notificationsQuery.maybeSingle.mockResolvedValueOnce({
      data: {
        id: notificationId,
        business_id: "76002ddd-634b-4c09-970b-0a50ac451485",
        recipient_user_id: profileId,
      },
      error: null,
    });

    const response = await PATCH(request({ read: true }), context());

    expect(response.status).toBe(403);
    expect(mocks.notificationsQuery.update).not.toHaveBeenCalled();
  });

  it("marque une notification autorisée comme lue", async () => {
    const response = await PATCH(request({ read: true }), context());

    expect(response.status).toBe(200);
    expect(mocks.notificationsQuery.update).toHaveBeenCalledWith({
      read_at: expect.any(String),
    });
  });
});
