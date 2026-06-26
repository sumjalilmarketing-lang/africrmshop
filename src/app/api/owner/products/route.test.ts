import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnerSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getOwnerSession: mocks.getOwnerSession,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: { from: mocks.from },
}));

import { POST } from "./route";

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/owner/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/owner/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnerSession.mockResolvedValue({
      profileId: "20000000-0000-0000-0000-000000000001",
      mustChangePassword: false,
      ownerships: [{ businessId: "30000000-0000-0000-0000-000000000001" }],
    });
  });

  it("refuse une requête sans session Owner", async () => {
    mocks.getOwnerSession.mockResolvedValue(null);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("refuse les informations produit invalides", async () => {
    const response = await POST(createRequest({ name: "A" }));

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
